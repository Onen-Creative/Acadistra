package services

import (
	"fmt"
	"mime/multipart"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type BulkCAMarksService struct {
	db                      *gorm.DB
	gradeCalculationService *GradeCalculationService
}

func NewBulkCAMarksService(db *gorm.DB) *BulkCAMarksService {
	return &BulkCAMarksService{
		db:                      db,
		gradeCalculationService: NewGradeCalculationService(db),
	}
}

type CAMarkRow struct {
	StudentID   string  `json:"student_id"`
	AdmissionNo string  `json:"admission_no"`
	StudentName string  `json:"student_name"`
	CA          float64 `json:"ca"`
}

func (s *BulkCAMarksService) ValidateClass(classID, schoolID string) (*models.Class, error) {
	var class models.Class
	if err := s.db.Where("id = ? AND school_id = ?", classID, schoolID).First(&class).Error; err != nil {
		return nil, fmt.Errorf("class not found")
	}

	if class.Level == "S1" || class.Level == "S2" || class.Level == "S3" || class.Level == "S4" {
		return nil, fmt.Errorf("S1-S4 use AOI marks, not CA marks. Use AOI import instead")
	}

	return &class, nil
}

func (s *BulkCAMarksService) ParseCAFile(file *multipart.FileHeader, schoolID string, class models.Class) ([]CAMarkRow, []string, int) {
	var validMarks []CAMarkRow
	var errors []string

	src, err := file.Open()
	if err != nil {
		errors = append(errors, "Failed to open file")
		return validMarks, errors, 0
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		errors = append(errors, "Invalid Excel file")
		return validMarks, errors, 0
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		errors = append(errors, "No sheets found")
		return validMarks, errors, 0
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil || len(rows) < 5 {
		errors = append(errors, "Invalid file format or no data rows")
		return validMarks, errors, 0
	}

	dataRows := rows[4:]
	nonEmptyCount := 0
	for _, row := range dataRows {
		if len(row) > 0 && row[0] != "" {
			nonEmptyCount++
		}
	}
	totalRows := nonEmptyCount

	for i, row := range rows[4:] {
		if len(row) == 0 || (len(row) > 0 && strings.TrimSpace(row[0]) == "") {
			continue
		}

		if len(row) < 3 {
			errors = append(errors, fmt.Sprintf("Row %d: Insufficient columns", i+5))
			continue
		}

		admissionNo := strings.TrimSpace(row[0])
		caStr := strings.TrimSpace(row[2])

		if admissionNo == "" {
			continue
		}

		var student models.Student
		if err := s.db.Where("admission_no = ? AND school_id = ?", admissionNo, schoolID).First(&student).Error; err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Student %s not found", i+5, admissionNo))
			continue
		}

		// Allow empty CA marks for absent students
		if caStr == "" {
			continue
		}

		ca, err := strconv.ParseFloat(caStr, 64)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Invalid CA mark '%s' - must be a number", i+5, caStr))
			continue
		}

		maxCA := 40.0
		if class.Level == "Baby" || class.Level == "Middle" || class.Level == "Top" || class.Level == "Nursery" {
			maxCA = 100.0
		}

		if ca < 0 || ca > maxCA {
			errors = append(errors, fmt.Sprintf("Row %d: CA mark %.1f must be between 0 and %.0f for %s", i+5, ca, maxCA, class.Level))
			continue
		}

		validMarks = append(validMarks, CAMarkRow{
			StudentID:   student.ID.String(),
			AdmissionNo: admissionNo,
			StudentName: fmt.Sprintf("%s %s", student.FirstName, student.LastName),
			CA:          ca,
		})
	}

	return validMarks, errors, totalRows
}

func (s *BulkCAMarksService) ImportCAMarks(validMarks []CAMarkRow, classID, subjectID, schoolID, term string, year int, examType string, classLevel string) []string {
	var errors []string

	for _, mark := range validMarks {
		var result models.SubjectResult
		err := s.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ?",
			uuid.MustParse(mark.StudentID), uuid.MustParse(subjectID), term, year, examType).
			First(&result).Error

		if err == gorm.ErrRecordNotFound {
			result = models.SubjectResult{
				StudentID: uuid.MustParse(mark.StudentID),
				SubjectID: uuid.MustParse(subjectID),
				ClassID:   uuid.MustParse(classID),
				Term:      term,
				Year:      year,
				ExamType:  examType,
				SchoolID:  uuid.MustParse(schoolID),
				RawMarks: models.JSONB{
					"ca": mark.CA,
				},
			}
			if err := s.db.Create(&result).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Failed to save CA marks for %s: %v", mark.AdmissionNo, err))
			}
		} else if err != nil {
			errors = append(errors, fmt.Sprintf("Database error for %s: %v", mark.AdmissionNo, err))
		} else {
			if result.RawMarks == nil {
				result.RawMarks = make(models.JSONB)
			}
			result.RawMarks["ca"] = mark.CA

			exam := 0.0
			if e, ok := result.RawMarks["exam"].(float64); ok {
				exam = e
			}

			if exam > 0 {
				gradeResult, rawMarks := s.gradeCalculationService.RecalculateGradeWithCA(
					classLevel,
					mark.CA,
					exam,
				)
				result.RawMarks = rawMarks
				result.FinalGrade = gradeResult.FinalGrade
				result.ComputationReason = gradeResult.ComputationReason
				result.RuleVersionHash = gradeResult.RuleVersionHash
			}

			if err := s.db.Save(&result).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Failed to update CA marks for %s: %v", mark.AdmissionNo, err))
			}
		}
	}

	return errors
}

func (s *BulkCAMarksService) GetStudentsForTemplate(classID, schoolID string) ([]models.Student, error) {
	var students []models.Student
	err := s.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND students.school_id = ? AND enrollments.status = 'active'", classID, schoolID).
		Order("students.first_name ASC, students.last_name ASC").
		Find(&students).Error
	return students, err
}

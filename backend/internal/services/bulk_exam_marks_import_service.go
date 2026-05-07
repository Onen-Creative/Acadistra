package services

import (
	"fmt"
	"mime/multipart"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type BulkExamMarksImportService struct {
	repo                    repositories.BulkExamMarksImportRepository
	gradeCalculationService *GradeCalculationService
}

func NewBulkExamMarksImportService(repo repositories.BulkExamMarksImportRepository, gradeService *GradeCalculationService) *BulkExamMarksImportService {
	return &BulkExamMarksImportService{
		repo:                    repo,
		gradeCalculationService: gradeService,
	}
}

type ExamMarkRow struct {
	StudentID   string  `json:"student_id"`
	AdmissionNo string  `json:"admission_no"`
	StudentName string  `json:"student_name"`
	Exam        float64 `json:"exam"`
}

type ExamMarksValidationResult struct {
	TotalRows   int           `json:"total_rows"`
	ValidRows   int           `json:"valid_rows"`
	InvalidRows int           `json:"invalid_rows"`
	ValidMarks  []ExamMarkRow `json:"valid_marks"`
	Errors      []string      `json:"errors"`
}

type ExamMarksImportResult struct {
	Message     string   `json:"message"`
	TotalRows   int      `json:"total_rows"`
	ValidRows   int      `json:"valid_rows"`
	InvalidRows int      `json:"invalid_rows"`
	Errors      []string `json:"errors"`
}

func (s *BulkExamMarksImportService) ValidateExamMarks(file *multipart.FileHeader, schoolID string) (*ExamMarksValidationResult, error) {
	validMarks, errors, totalRows := s.parseExamFile(file, schoolID)
	return &ExamMarksValidationResult{
		TotalRows:   totalRows,
		ValidRows:   len(validMarks),
		InvalidRows: len(errors),
		ValidMarks:  validMarks,
		Errors:      errors,
	}, nil
}

func (s *BulkExamMarksImportService) ImportExamMarks(file *multipart.FileHeader, schoolID, classID, subjectID, term string, year, paper int, examType string) (*ExamMarksImportResult, error) {
	validMarks, errors, totalRows := s.parseExamFile(file, schoolID)

	class, err := s.repo.FindClassByID(classID)
	if err != nil {
		return nil, fmt.Errorf("class not found")
	}

	for _, mark := range validMarks {
		existingResult, err := s.repo.FindExistingResult(
			uuid.MustParse(mark.StudentID),
			uuid.MustParse(subjectID),
			term, year, examType, paper,
		)

		var existingCA *float64
		if err == nil && existingResult.RawMarks != nil {
			if ca, ok := existingResult.RawMarks["ca"].(float64); ok {
				existingCA = &ca
			}
		}

		gradeResult, rawMarks, calcErr := s.gradeCalculationService.CalculateGradeForResult(
			class.Level,
			uuid.MustParse(mark.StudentID),
			uuid.MustParse(subjectID),
			term, year,
			mark.Exam,
			existingCA,
		)
		if calcErr != nil {
			errors = append(errors, fmt.Sprintf("Failed to calculate grade for %s: %v", mark.AdmissionNo, calcErr))
			continue
		}

		if err == gorm.ErrRecordNotFound {
			result := &models.SubjectResult{
				StudentID:         uuid.MustParse(mark.StudentID),
				SubjectID:         uuid.MustParse(subjectID),
				ClassID:           uuid.MustParse(classID),
				Term:              term,
				Year:              year,
				ExamType:          examType,
				Paper:             paper,
				SchoolID:          uuid.MustParse(schoolID),
				RawMarks:          rawMarks,
				FinalGrade:        gradeResult.FinalGrade,
				ComputationReason: gradeResult.ComputationReason,
				RuleVersionHash:   gradeResult.RuleVersionHash,
			}
			if err := s.repo.CreateResult(result); err != nil {
				errors = append(errors, fmt.Sprintf("Failed to save exam marks for %s: %v", mark.AdmissionNo, err))
			}
		} else if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to check existing marks for %s: %v", mark.AdmissionNo, err))
		} else {
			existingResult.RawMarks = rawMarks
			existingResult.FinalGrade = gradeResult.FinalGrade
			existingResult.ComputationReason = gradeResult.ComputationReason
			existingResult.RuleVersionHash = gradeResult.RuleVersionHash
			if err := s.repo.UpdateResult(existingResult); err != nil {
				errors = append(errors, fmt.Sprintf("Failed to update exam marks for %s: %v", mark.AdmissionNo, err))
			}
		}
	}

	// For S5/S6, recalculate all grades after import to ensure correct aggregation
	if class.Level == "S5" || class.Level == "S6" {
		s.recalculateAdvancedLevelGrades(schoolID, classID, subjectID, term, year, examType, class.Level)
	}

	return &ExamMarksImportResult{
		Message:     "Exam marks imported successfully",
		TotalRows:   totalRows,
		ValidRows:   len(validMarks),
		InvalidRows: len(errors),
		Errors:      errors,
	}, nil
}

func (s *BulkExamMarksImportService) parseExamFile(file *multipart.FileHeader, schoolID string) ([]ExamMarkRow, []string, int) {
	var validMarks []ExamMarkRow
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
			errors = append(errors, fmt.Sprintf("Row %d: Insufficient columns (expected: admission_no, student_name, exam)", i+5))
			continue
		}

		admissionNo := strings.TrimSpace(row[0])
		examStr := strings.TrimSpace(row[2])

		if admissionNo == "" {
			continue
		}

		student, err := s.repo.FindStudentByAdmissionNo(admissionNo, schoolID)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Student %s not found", i+5, admissionNo))
			continue
		}

		exam, err := strconv.ParseFloat(examStr, 64)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Invalid exam mark '%s'", i+5, examStr))
			continue
		}

		validMarks = append(validMarks, ExamMarkRow{
			StudentID:   student.ID.String(),
			AdmissionNo: admissionNo,
			StudentName: fmt.Sprintf("%s %s", student.FirstName, student.LastName),
			Exam:        exam,
		})
	}

	return validMarks, errors, totalRows
}

func (s *BulkExamMarksImportService) GenerateTemplate(classID, schoolID string) (*excelize.File, error) {
	f := excelize.NewFile()
	sheet := "Exam Marks"
	f.SetSheetName("Sheet1", sheet)

	f.SetCellValue(sheet, "A1", "EXAM MARKS IMPORT TEMPLATE")
	f.MergeCell(sheet, "A1", "C1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, "A1", "C1", titleStyle)

	f.SetCellValue(sheet, "A2", "Instructions: Enter exam marks only. Do NOT include AOI marks here.")
	f.MergeCell(sheet, "A2", "C2")
	instructionStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Italic: true, Color: "FF0000"},
	})
	f.SetCellStyle(sheet, "A2", "C2", instructionStyle)

	headers := []string{"admission_no", "student_name", "exam"}
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"4472C4"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})

	for i, header := range headers {
		cell := fmt.Sprintf("%c4", 'A'+i)
		f.SetCellValue(sheet, cell, header)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	if classID != "" {
		students, _ := s.repo.FindStudentsByClassID(classID, schoolID)
		for i, student := range students {
			row := i + 5
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), student.AdmissionNo)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s %s", student.FirstName, student.LastName))
		}
	}

	f.SetColWidth(sheet, "A", "A", 15)
	f.SetColWidth(sheet, "B", "B", 30)
	f.SetColWidth(sheet, "C", "C", 12)

	return f, nil
}

// recalculateAdvancedLevelGrades recalculates all grades for S5/S6 students after bulk import
func (s *BulkExamMarksImportService) recalculateAdvancedLevelGrades(schoolID, classID, subjectID, term string, year int, examType, level string) {
	// Get all unique students who have marks for this subject/term/year
	var studentIDs []string
	s.repo.GetDB().Table("subject_results").
		Select("DISTINCT student_id").
		Where("school_id = ? AND class_id = ? AND subject_id = ? AND term = ? AND year = ? AND deleted_at IS NULL",
			schoolID, classID, subjectID, term, year).
		Pluck("student_id", &studentIDs)

	// For each student, recalculate their grade
	for _, studentID := range studentIDs {
		s.gradeCalculationService.RecalculateStudentGrade(
			uuid.MustParse(studentID),
			uuid.MustParse(subjectID),
			term,
			year,
			level,
		)
	}
}

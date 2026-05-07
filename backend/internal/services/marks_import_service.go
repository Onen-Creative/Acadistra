package services

import (
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type MarksImportService struct {
	repo repositories.MarksImportRepository
}

func NewMarksImportService(repo repositories.MarksImportRepository) *MarksImportService {
	return &MarksImportService{repo: repo}
}

type MarksImportResult struct {
	SuccessCount int      `json:"success_count"`
	ErrorCount   int      `json:"error_count"`
	Errors       []string `json:"errors"`
}

func (s *MarksImportService) ProcessExcelFile(file *excelize.File, schoolID, userID string) (*MarksImportResult, error) {
	sheets := file.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("no sheets found in file")
	}

	rows, err := file.GetRows(sheets[0])
	if err != nil || len(rows) < 2 {
		return nil, fmt.Errorf("invalid file format")
	}

	// Validate headers
	headers := rows[0]
	expectedHeaders := []string{"admission_no", "student_name", "class", "subject", "assessment", "term", "year", "bot", "mot", "eot"}
	if len(headers) < len(expectedHeaders) {
		return nil, fmt.Errorf("invalid headers")
	}

	var successCount, errorCount int
	var errors []string

	// Process each row
	for i, row := range rows[1:] {
		if len(row) < 10 {
			errors = append(errors, fmt.Sprintf("Row %d: Insufficient columns", i+2))
			errorCount++
			continue
		}

		admissionNo := row[0]
		className := row[2]
		subjectCode := row[3]
		term := row[5]
		yearStr := row[6]
		botStr := row[7]
		motStr := row[8]
		eotStr := row[9]

		// Find student
		student, err := s.repo.FindStudentByAdmissionNo(admissionNo, schoolID)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Student %s not found", i+2, admissionNo))
			errorCount++
			continue
		}

		// Parse marks
		bot, _ := strconv.ParseFloat(botStr, 64)
		mot, _ := strconv.ParseFloat(motStr, 64)
		eot, _ := strconv.ParseFloat(eotStr, 64)
		year, _ := strconv.Atoi(yearStr)

		// Find subject
		subject, err := s.repo.FindStandardSubjectByCode(subjectCode)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Subject %s not found", i+2, subjectCode))
			errorCount++
			continue
		}

		// Find class
		class, err := s.repo.FindClassByName(className, schoolID)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Class not found", i+2))
			errorCount++
			continue
		}

		// Process each assessment type
		assessmentTypes := []string{"BOT", "MOT", "EOT"}
		marks := []float64{bot, mot, eot}

		for j, assessmentType := range assessmentTypes {
			if marks[j] == 0 {
				continue
			}

			// Find or create assessment
			assessment, err := s.repo.FindAssessment(schoolID, class.ID, subject.ID, assessmentType, term, year)
			if err == gorm.ErrRecordNotFound {
				assessment = &models.Assessment{
					SchoolID:       uuid.MustParse(schoolID),
					ClassID:        class.ID,
					SubjectID:      subject.ID,
					AssessmentType: assessmentType,
					MaxMarks:       100,
					Term:           term,
					Year:           year,
					CreatedBy:      uuid.MustParse(userID),
				}
				if err := s.repo.CreateAssessment(assessment); err != nil {
					errors = append(errors, fmt.Sprintf("Row %d: Failed to create assessment", i+2))
					errorCount++
					continue
				}
			} else if err != nil {
				errors = append(errors, fmt.Sprintf("Row %d: Failed to find assessment", i+2))
				errorCount++
				continue
			}

			// Create or update mark
			mark, err := s.repo.FindMark(assessment.ID, student.ID)
			if err == gorm.ErrRecordNotFound {
				mark = &models.Mark{
					AssessmentID:  assessment.ID,
					StudentID:     student.ID,
					MarksObtained: marks[j],
					EnteredBy:     uuid.MustParse(userID),
					EnteredAt:     time.Now(),
				}
				if err := s.repo.CreateMark(mark); err != nil {
					errors = append(errors, fmt.Sprintf("Row %d: Failed to create mark", i+2))
					errorCount++
					continue
				}
			} else if err != nil {
				errors = append(errors, fmt.Sprintf("Row %d: Failed to find mark", i+2))
				errorCount++
				continue
			} else {
				mark.MarksObtained = marks[j]
				if err := s.repo.UpdateMark(mark); err != nil {
					errors = append(errors, fmt.Sprintf("Row %d: Failed to update mark", i+2))
					errorCount++
					continue
				}
			}
		}

		successCount++
	}

	return &MarksImportResult{
		SuccessCount: successCount,
		ErrorCount:   errorCount,
		Errors:       errors,
	}, nil
}

func (s *MarksImportService) GenerateTemplate() (*excelize.File, error) {
	f := excelize.NewFile()
	sheet := "Marks Template"
	f.SetSheetName("Sheet1", sheet)

	// Set headers
	headers := []string{"admission_no", "student_name", "class", "subject", "assessment", "term", "year", "bot", "mot", "eot"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheet, cell, header)
	}

	// Add sample data
	sampleData := [][]interface{}{
		{"STD001", "John Doe", "P5", "Mathematics", "BOT", "Term 1", 2025, 75, 80, 85},
		{"STD002", "Jane Smith", "P5", "English", "BOT", "Term 1", 2025, 70, 75, 80},
	}

	for i, row := range sampleData {
		for j, val := range row {
			cell := fmt.Sprintf("%c%d", 'A'+j, i+2)
			f.SetCellValue(sheet, cell, val)
		}
	}

	// Style headers
	style, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
	})
	f.SetCellStyle(sheet, "A1", "J1", style)
	f.SetColWidth(sheet, "A", "J", 15)

	return f, nil
}

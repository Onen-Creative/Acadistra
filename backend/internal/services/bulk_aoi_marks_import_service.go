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
)

type BulkAOIMarksImportService struct {
	repo                    repositories.BulkAOIMarksImportRepository
	gradeCalculationService *GradeCalculationService
}

func NewBulkAOIMarksImportService(repo repositories.BulkAOIMarksImportRepository, gradeService *GradeCalculationService) *BulkAOIMarksImportService {
	return &BulkAOIMarksImportService{
		repo:                    repo,
		gradeCalculationService: gradeService,
	}
}

type AOIMarkRow struct {
	StudentID   string             `json:"student_id"`
	AdmissionNo string             `json:"admission_no"`
	StudentName string             `json:"student_name"`
	Activities  map[string]float64 `json:"activities"`
}

type AOIMarksValidationResult struct {
	TotalRows   int          `json:"total_rows"`
	ValidRows   int          `json:"valid_rows"`
	InvalidRows int          `json:"invalid_rows"`
	ValidMarks  []AOIMarkRow `json:"valid_marks"`
	Errors      []string     `json:"errors"`
}

type AOIMarksImportResult struct {
	Message     string   `json:"message"`
	TotalRows   int      `json:"total_rows"`
	ValidRows   int      `json:"valid_rows"`
	InvalidRows int      `json:"invalid_rows"`
	Errors      []string `json:"errors"`
}

func (s *BulkAOIMarksImportService) ValidateAOIMarks(file *multipart.FileHeader, schoolID, classID, subjectID, term string, year int) (*AOIMarksValidationResult, error) {
	class, err := s.repo.FindClassByID(classID, schoolID)
	if err != nil {
		return nil, fmt.Errorf("class not found")
	}

	if class.Level != "S1" && class.Level != "S2" && class.Level != "S3" && class.Level != "S4" {
		return nil, fmt.Errorf("AOI marks are only for S1-S4 levels")
	}

	validMarks, errors, totalRows := s.parseAOIFile(file, schoolID)
	return &AOIMarksValidationResult{
		TotalRows:   totalRows,
		ValidRows:   len(validMarks),
		InvalidRows: len(errors),
		ValidMarks:  validMarks,
		Errors:      errors,
	}, nil
}

func (s *BulkAOIMarksImportService) ImportAOIMarks(file *multipart.FileHeader, schoolID, classID, subjectID, term string, year int) (*AOIMarksImportResult, error) {
	class, err := s.repo.FindClassByID(classID, schoolID)
	if err != nil {
		return nil, fmt.Errorf("class not found")
	}

	if class.Level != "S1" && class.Level != "S2" && class.Level != "S3" && class.Level != "S4" {
		return nil, fmt.Errorf("AOI marks are only for S1-S4 levels")
	}

	validMarks, errors, totalRows := s.parseAOIFile(file, schoolID)

	for _, mark := range validMarks {
		marksJSONB := make(models.JSONB)
		for k, v := range mark.Activities {
			marksJSONB[k] = v
		}

		aoiRecord := &models.IntegrationActivity{
			StudentID: uuid.MustParse(mark.StudentID),
			SubjectID: uuid.MustParse(subjectID),
			ClassID:   uuid.MustParse(classID),
			SchoolID:  uuid.MustParse(schoolID),
			Term:      term,
			Year:      year,
			Marks:     marksJSONB,
		}

		if err := s.repo.CreateIntegrationActivity(aoiRecord); err != nil {
			errors = append(errors, fmt.Sprintf("Failed to save AOI marks for %s: %v", mark.AdmissionNo, err))
			continue
		}

		if err := s.gradeCalculationService.UpdateAllResultsWithAOI(
			uuid.MustParse(mark.StudentID),
			uuid.MustParse(subjectID),
			term, year,
			marksJSONB,
		); err != nil {
			errors = append(errors, fmt.Sprintf("Failed to update grade for %s: %v", mark.AdmissionNo, err))
		}
	}

	return &AOIMarksImportResult{
		Message:     "AOI marks imported successfully",
		TotalRows:   totalRows,
		ValidRows:   len(validMarks),
		InvalidRows: len(errors),
		Errors:      errors,
	}, nil
}

func (s *BulkAOIMarksImportService) parseAOIFile(file *multipart.FileHeader, schoolID string) ([]AOIMarkRow, []string, int) {
	var validMarks []AOIMarkRow
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
	if err != nil || len(rows) < 6 {
		errors = append(errors, "Invalid file format or no data rows")
		return validMarks, errors, 0
	}

	dataRows := rows[5:]
	nonEmptyCount := 0
	for _, row := range dataRows {
		if len(row) > 0 && strings.TrimSpace(row[0]) != "" {
			nonEmptyCount++
		}
	}
	totalRows := nonEmptyCount

	for i, row := range rows[5:] {
		if len(row) == 0 {
			continue
		}

		admissionNo := ""
		if len(row) > 0 {
			admissionNo = strings.TrimSpace(row[0])
		}

		if admissionNo == "" {
			continue
		}

		student, err := s.repo.FindStudentByAdmissionNo(admissionNo, schoolID)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Student %s not found", i+6, admissionNo))
			continue
		}

		activities := make(map[string]float64)
		hasError := false

		for j := 1; j <= 5; j++ {
			colIdx := j + 1
			if colIdx >= len(row) {
				continue
			}

			activityStr := strings.TrimSpace(row[colIdx])
			if activityStr == "" {
				// Allow empty activities for students who didn't complete them
				continue
			}

			mark, err := strconv.ParseFloat(activityStr, 64)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Row %d: Invalid activity%d mark '%s' - must be a number", i+6, j, activityStr))
				hasError = true
				break
			}

			if mark < 0 || mark > 3 {
				errors = append(errors, fmt.Sprintf("Row %d: Activity%d mark %.1f must be between 0 and 3", i+6, j, mark))
				hasError = true
				break
			}

			activities[fmt.Sprintf("activity%d", j)] = mark
		}

		if hasError {
			continue
		}

		validMarks = append(validMarks, AOIMarkRow{
			StudentID:   student.ID.String(),
			AdmissionNo: admissionNo,
			StudentName: fmt.Sprintf("%s %s", student.FirstName, student.LastName),
			Activities:  activities,
		})
	}

	return validMarks, errors, totalRows
}

func (s *BulkAOIMarksImportService) GenerateTemplate(classID, schoolID, level string) (*excelize.File, error) {
	if level != "" && level != "S1" && level != "S2" && level != "S3" && level != "S4" {
		return nil, fmt.Errorf("AOI marks template is only for S1-S4 levels")
	}

	f := excelize.NewFile()
	sheet := "AOI Marks"
	f.SetSheetName("Sheet1", sheet)

	f.SetCellValue(sheet, "A1", "ACTIVITY OF INTEGRATION (AOI) MARKS TEMPLATE")
	f.MergeCell(sheet, "A1", "G1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, "A1", "G1", titleStyle)

	f.SetCellValue(sheet, "A2", "Instructions: Enter marks for 5 activities (0-3 marks each). Leave blank if activity not done.")
	f.MergeCell(sheet, "A2", "G2")
	instructionStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Italic: true, Color: "FF0000"},
	})
	f.SetCellStyle(sheet, "A2", "G2", instructionStyle)

	headers := []string{"admission_no", "student_name", "activity1", "activity2", "activity3", "activity4", "activity5"}
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"4472C4"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})

	for i, header := range headers {
		cell := fmt.Sprintf("%c4", 'A'+i)
		f.SetCellValue(sheet, cell, header)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	f.SetCellValue(sheet, "C5", "Max: 3")
	f.SetCellValue(sheet, "D5", "Max: 3")
	f.SetCellValue(sheet, "E5", "Max: 3")
	f.SetCellValue(sheet, "F5", "Max: 3")
	f.SetCellValue(sheet, "G5", "Max: 3")
	noteStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Italic: true, Size: 9, Color: "808080"},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, "C5", "G5", noteStyle)

	if classID != "" {
		students, _ := s.repo.FindStudentsByClassID(classID, schoolID)
		for i, student := range students {
			row := i + 6
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), student.AdmissionNo)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s %s", student.FirstName, student.LastName))
		}
	}

	f.SetColWidth(sheet, "A", "A", 15)
	f.SetColWidth(sheet, "B", "B", 30)
	f.SetColWidth(sheet, "C", "G", 12)

	return f, nil
}

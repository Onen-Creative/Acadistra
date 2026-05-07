package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"github.com/xuri/excelize/v2"
)

type BulkMarksImportService struct {
	repo          repositories.BulkMarksImportRepository
	resultService *ResultService
}

func NewBulkMarksImportService(repo repositories.BulkMarksImportRepository, resultService *ResultService) *BulkMarksImportService {
	return &BulkMarksImportService{
		repo:          repo,
		resultService: resultService,
	}
}

type MarkRow struct {
	StudentID   string  `json:"student_id"`
	AdmissionNo string  `json:"admission_no"`
	StudentName string  `json:"student_name"`
	Exam        float64 `json:"exam"`
	Mark        float64 `json:"mark"`
	Paper       int     `json:"paper"`
}

type ImportResult struct {
	ImportID    uuid.UUID `json:"import_id"`
	Status      string    `json:"status"`
	TotalRows   int       `json:"total_rows"`
	ValidRows   int       `json:"valid_rows"`
	InvalidRows int       `json:"invalid_rows"`
	Errors      []string  `json:"errors"`
}

func (s *BulkMarksImportService) ProcessExcelUpload(file []byte, schoolID, classID, subjectID, term string, year int, examType, userID, userRole string, paper int) (*ImportResult, error) {
	// Get class level
	class, err := s.repo.FindClassByID(uuid.MustParse(classID))
	if err != nil {
		return nil, fmt.Errorf("class not found")
	}
	isAdvanced := class.Level == "S5" || class.Level == "S6"

	// Check if marks already exist
	count, err := s.repo.CountExistingMarksWithPaper(
		uuid.MustParse(schoolID),
		uuid.MustParse(classID),
		uuid.MustParse(subjectID),
		term, year, examType, paper,
	)
	if err != nil {
		return nil, err
	}
	if count > 0 {
		if isAdvanced && paper > 0 {
			return nil, fmt.Errorf("marks already exist for this subject Paper %d", paper)
		}
		return nil, fmt.Errorf("marks already exist for this combination")
	}

	// Parse Excel file
	validMarks, errors, totalRows, err := s.parseExcelFile(file, schoolID, classID, isAdvanced, paper)
	if err != nil {
		return nil, err
	}

	marksJSON, _ := json.Marshal(validMarks)
	errorsJSON, _ := json.Marshal(errors)

	marksImport := &models.MarksImport{
		SchoolID:    uuid.MustParse(schoolID),
		ClassID:     uuid.MustParse(classID),
		SubjectID:   uuid.MustParse(subjectID),
		Term:        term,
		Year:        year,
		ExamType:    examType,
		Status:      "pending",
		UploadedBy:  uuid.MustParse(userID),
		TotalRows:   totalRows,
		ValidRows:   len(validMarks),
		InvalidRows: len(errors),
		Errors:      string(errorsJSON),
		Data:        string(marksJSON),
	}

	// Auto-approve for school admins
	if userRole == "school_admin" {
		marksImport.Status = "approved"
		now := time.Now()
		marksImport.ApprovedBy = &marksImport.UploadedBy
		marksImport.ApprovedAt = &now
	}

	if err := s.repo.CreateImport(marksImport); err != nil {
		return nil, err
	}

	// Process immediately if approved
	if marksImport.Status == "approved" {
		if err := s.ProcessMarksImport(marksImport); err != nil {
			return nil, err
		}
	}

	return &ImportResult{
		ImportID:    marksImport.ID,
		Status:      marksImport.Status,
		TotalRows:   totalRows,
		ValidRows:   len(validMarks),
		InvalidRows: len(errors),
		Errors:      errors,
	}, nil
}

func (s *BulkMarksImportService) parseExcelFile(fileData []byte, schoolID, classID string, isAdvanced bool, paper int) ([]MarkRow, []string, int, error) {
	f, err := excelize.OpenReader(bytes.NewReader(fileData))
	if err != nil {
		return nil, nil, 0, fmt.Errorf("invalid Excel file")
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, nil, 0, fmt.Errorf("no sheets found")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil || len(rows) < 2 {
		return nil, nil, 0, fmt.Errorf("invalid file format")
	}

	// Find the header row (skip metadata rows)
	headerRowIndex := -1
	for i, row := range rows {
		if len(row) > 0 && row[0] == "admission_no" {
			headerRowIndex = i
			break
		}
	}

	if headerRowIndex == -1 {
		return nil, nil, 0, fmt.Errorf("header row not found")
	}

	var validMarks []MarkRow
	var errors []string
	dataRows := rows[headerRowIndex+1:]
	totalRows := len(dataRows)

	for i, row := range dataRows {
		rowNum := headerRowIndex + i + 2
		if len(row) < 2 {
			errors = append(errors, fmt.Sprintf("Row %d: Insufficient columns", rowNum))
			continue
		}

		admissionNo := row[0]
		if admissionNo == "" {
			continue // Skip empty rows
		}

		student, err := s.repo.FindStudentByAdmissionNo(admissionNo, uuid.MustParse(schoolID))
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Student %s not found", rowNum, admissionNo))
			continue
		}

		// Get class to determine max marks
		class, err := s.repo.FindClassByID(uuid.MustParse(classID))
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Unable to validate marks", rowNum))
			continue
		}

		if isAdvanced {
			// Advanced Level: admission_no, student_name, mark (max 100)
			if len(row) < 3 {
				errors = append(errors, fmt.Sprintf("Row %d: Mark column missing", rowNum))
				continue
			}
			markStr := row[2]
			if markStr == "" {
				// Allow empty marks for absent students
				continue
			}
			mark, err := strconv.ParseFloat(markStr, 64)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Row %d: Invalid mark value '%s'", rowNum, markStr))
				continue
			}
			if mark < 0 || mark > 100 {
				errors = append(errors, fmt.Sprintf("Row %d: Mark %.1f must be between 0 and 100", rowNum, mark))
				continue
			}

			validMarks = append(validMarks, MarkRow{
				StudentID:   student.ID.String(),
				AdmissionNo: admissionNo,
				StudentName: fmt.Sprintf("%s %s", student.FirstName, student.LastName),
				Mark:        mark,
				Paper:       paper,
			})
		} else {
			// Other levels: admission_no, student_name, exam/ca/aoi
			if len(row) < 3 {
				errors = append(errors, fmt.Sprintf("Row %d: Mark column missing", rowNum))
				continue
			}
			markStr := row[2]
			if markStr == "" {
				// Allow empty marks for absent students
				continue
			}
			markValue, err := strconv.ParseFloat(markStr, 64)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Row %d: Invalid mark value '%s'", rowNum, markStr))
				continue
			}
			
			// Validate based on level and mark type
			var maxMark float64
			var markType string
			
			switch class.Level {
			case "S1", "S2", "S3", "S4":
				// Ordinary level - could be exam (80) or AOI (3)
				// Check if this is AOI import by looking at value range
				if markValue <= 3 {
					maxMark = 3
					markType = "AOI"
				} else {
					maxMark = 80
					markType = "Exam"
				}
			case "Baby", "Middle", "Top":
				// Nursery - could be exam (100) or CA (100)
				maxMark = 100
				markType = "Mark"
			default:
				// Primary P1-P7 - could be exam (60) or CA (40)
				if markValue <= 40 {
					maxMark = 40
					markType = "CA"
				} else {
					maxMark = 60
					markType = "Exam"
				}
			}
			
			if markValue < 0 || markValue > maxMark {
				errors = append(errors, fmt.Sprintf("Row %d: %s mark %.1f must be between 0 and %.0f for %s", rowNum, markType, markValue, maxMark, class.Level))
				continue
			}

			validMarks = append(validMarks, MarkRow{
				StudentID:   student.ID.String(),
				AdmissionNo: admissionNo,
				StudentName: fmt.Sprintf("%s %s", student.FirstName, student.LastName),
				Exam:        markValue,
			})
		}
	}

	return validMarks, errors, totalRows, nil
}

func (s *BulkMarksImportService) ListImports(schoolID, status string) ([]models.MarksImport, error) {
	return s.repo.FindImportsBySchoolID(uuid.MustParse(schoolID), status)
}

func (s *BulkMarksImportService) GetImportDetails(importID, schoolID string) (*models.MarksImport, []MarkRow, []string, error) {
	marksImport, err := s.repo.FindImportByID(uuid.MustParse(importID), uuid.MustParse(schoolID))
	if err != nil {
		return nil, nil, nil, err
	}

	var marks []MarkRow
	json.Unmarshal([]byte(marksImport.Data), &marks)

	var errors []string
	json.Unmarshal([]byte(marksImport.Errors), &errors)

	return marksImport, marks, errors, nil
}

func (s *BulkMarksImportService) ApproveImport(importID, schoolID, userID string) error {
	marksImport, err := s.repo.FindImportByID(uuid.MustParse(importID), uuid.MustParse(schoolID))
	if err != nil {
		return err
	}

	if marksImport.Status != "pending" {
		return fmt.Errorf("import already processed")
	}

	now := time.Now()
	approverID := uuid.MustParse(userID)
	marksImport.Status = "approved"
	marksImport.ApprovedBy = &approverID
	marksImport.ApprovedAt = &now

	if err := s.repo.UpdateImport(marksImport); err != nil {
		return err
	}

	return s.ProcessMarksImport(marksImport)
}

func (s *BulkMarksImportService) RejectImport(importID, schoolID, userID, reason string) error {
	marksImport, err := s.repo.FindImportByID(uuid.MustParse(importID), uuid.MustParse(schoolID))
	if err != nil {
		return err
	}

	if marksImport.Status != "pending" {
		return fmt.Errorf("import already processed")
	}

	now := time.Now()
	rejectorID := uuid.MustParse(userID)
	marksImport.Status = "rejected"
	marksImport.RejectedBy = &rejectorID
	marksImport.RejectedAt = &now
	marksImport.RejectionReason = reason

	return s.repo.UpdateImport(marksImport)
}

func (s *BulkMarksImportService) ProcessMarksImport(marksImport *models.MarksImport) error {
	var marks []MarkRow
	if err := json.Unmarshal([]byte(marksImport.Data), &marks); err != nil {
		return err
	}

	// Get class level
	class, err := s.repo.FindClassByID(marksImport.ClassID)
	if err != nil {
		return err
	}
	isAdvanced := class.Level == "S5" || class.Level == "S6"

	for _, mark := range marks {
		var rawMarks models.JSONB

		if isAdvanced {
			// Advanced Level: store mark and paper number
			rawMarks = models.JSONB{
				"mark":  mark.Mark,
				"paper": mark.Paper,
			}
		} else {
			// Other levels: store only exam (AOI imported separately)
			rawMarks = models.JSONB{
				"exam": mark.Exam,
			}
		}

		// Use ResultService.CreateOrUpdateResult for proper grade calculation
		result := &models.SubjectResult{
			StudentID: uuid.MustParse(mark.StudentID),
			SubjectID: marksImport.SubjectID,
			Term:      marksImport.Term,
			Year:      marksImport.Year,
			ExamType:  marksImport.ExamType,
			RawMarks:  rawMarks,
		}

		if _, err := s.resultService.CreateOrUpdateResult(result, marksImport.SchoolID.String(), marksImport.UploadedBy.String()); err != nil {
			return err
		}
	}

	return nil
}

func (s *BulkMarksImportService) GenerateTemplate(classID, schoolID, year, term, subjectID, examType, paper string) (*excelize.File, error) {
	f := excelize.NewFile()
	sheet := "Marks"
	f.SetSheetName("Sheet1", sheet)

	// Get school, class, and subject details
	school, _ := s.repo.FindSchoolByID(uuid.MustParse(schoolID))
	class, err := s.repo.FindClassByID(uuid.MustParse(classID))
	isAdvanced := false
	if err == nil {
		isAdvanced = class.Level == "S5" || class.Level == "S6"
	}
	isOrdinary := false
	if err == nil {
		isOrdinary = class.Level == "S1" || class.Level == "S2" || class.Level == "S3" || class.Level == "S4"
	}

	var subject *models.StandardSubject
	if subjectID != "" {
		subject, _ = s.repo.FindSubjectByID(uuid.MustParse(subjectID))
	}

	// Add header information
	schoolName := "School"
	if school != nil {
		schoolName = school.Name
	}
	className := "Class"
	if class != nil {
		className = class.Name
	}
	subjectName := "Subject"
	if subject != nil {
		subjectName = subject.Name
	}

	// Merge cells for header
	f.MergeCell(sheet, "A1", "D1")
	f.SetCellValue(sheet, "A1", schoolName)
	f.MergeCell(sheet, "A2", "D2")
	f.SetCellValue(sheet, "A2", "MARKS IMPORT TEMPLATE")

	// Add metadata rows
	row := 4
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Year:")
	f.SetCellValue(sheet, fmt.Sprintf("B%d", row), year)
	row++
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Term:")
	f.SetCellValue(sheet, fmt.Sprintf("B%d", row), term)
	row++
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Class:")
	f.SetCellValue(sheet, fmt.Sprintf("B%d", row), className)
	row++
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Subject:")
	f.SetCellValue(sheet, fmt.Sprintf("B%d", row), subjectName)
	row++
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Exam Type:")
	f.SetCellValue(sheet, fmt.Sprintf("B%d", row), examType)
	row++
	if isAdvanced && paper != "" && paper != "0" {
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Paper:")
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), paper)
		row++
	}

	// Column headers start after metadata
	headerRow := row + 1
	var headers []string
	if isAdvanced {
		headers = []string{"admission_no", "student_name", "mark"}
	} else if isOrdinary {
		// Ordinary level: only exam (AOI imported separately)
		headers = []string{"admission_no", "student_name", "exam"}
	} else {
		// Primary/Nursery: only exam (CA imported separately)
		headers = []string{"admission_no", "student_name", "exam"}
	}

	for i, header := range headers {
		cell := fmt.Sprintf("%c%d", 'A'+i, headerRow)
		f.SetCellValue(sheet, cell, header)
	}

	// Add student data if class_id provided
	if classID != "" {
		students, err := s.repo.FindStudentsByClassID(uuid.MustParse(classID), uuid.MustParse(schoolID))
		if err == nil {
			for i, student := range students {
				dataRow := headerRow + i + 1
				f.SetCellValue(sheet, fmt.Sprintf("A%d", dataRow), student.AdmissionNo)
				f.SetCellValue(sheet, fmt.Sprintf("B%d", dataRow), fmt.Sprintf("%s %s", student.FirstName, student.LastName))
			}
		}
	}

	// Styling
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 16},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheet, "A1", "D1", titleStyle)

	subtitleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheet, "A2", "D2", subtitleStyle)

	metaStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
	})
	f.SetCellStyle(sheet, "A4", fmt.Sprintf("A%d", row), metaStyle)

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "#FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	lastCol := string(rune('A' + len(headers) - 1))
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", headerRow), fmt.Sprintf("%s%d", lastCol, headerRow), headerStyle)

	// Set column widths
	f.SetColWidth(sheet, "A", "A", 20)
	f.SetColWidth(sheet, "B", "B", 30)
	f.SetColWidth(sheet, "C", "C", 15)

	// Set row heights
	f.SetRowHeight(sheet, 1, 25)
	f.SetRowHeight(sheet, 2, 20)

	return f, nil
}

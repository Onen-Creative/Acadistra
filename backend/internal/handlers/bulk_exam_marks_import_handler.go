package handlers

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type BulkExamMarksImportHandler struct {
	db                      *gorm.DB
	gradeCalculationService *services.GradeCalculationService
}

func NewBulkExamMarksImportHandler(db *gorm.DB) *BulkExamMarksImportHandler {
	return &BulkExamMarksImportHandler{
		db:                      db,
		gradeCalculationService: services.NewGradeCalculationService(db),
	}
}

type ExamMarkRow struct {
	StudentID   string  `json:"student_id"`
	AdmissionNo string  `json:"admission_no"`
	StudentName string  `json:"student_name"`
	Exam        float64 `json:"exam"`
}

// ValidateExamMarks validates Excel file without saving
func (h *BulkExamMarksImportHandler) ValidateExamMarks(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.PostForm("class_id")
	subjectID := c.PostForm("subject_id")
	term := c.PostForm("term")
	yearStr := c.PostForm("year")
	examType := c.PostForm("exam_type")

	if classID == "" || subjectID == "" || term == "" || yearStr == "" || examType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	validMarks, errors, totalRows := h.parseExamFile(file, schoolID)

	c.JSON(http.StatusOK, gin.H{
		"total_rows":   totalRows,
		"valid_rows":   len(validMarks),
		"invalid_rows": len(errors),
		"valid_marks":  validMarks,
		"errors":       errors,
	})
}

// UploadExamMarksForApproval handles Excel upload for exam marks only
func (h *BulkExamMarksImportHandler) UploadExamMarksForApproval(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.PostForm("class_id")
	subjectID := c.PostForm("subject_id")
	term := c.PostForm("term")
	yearStr := c.PostForm("year")
	examType := c.PostForm("exam_type")
	paperStr := c.PostForm("paper")

	if classID == "" || subjectID == "" || term == "" || yearStr == "" || examType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	year, _ := strconv.Atoi(yearStr)
	paper := 0
	if paperStr != "" {
		paper, _ = strconv.Atoi(paperStr)
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	validMarks, errors, totalRows := h.parseExamFile(file, schoolID)

	// Get class to determine grading system
	var class models.Class
	if err := h.db.Where("id = ?", classID).First(&class).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
		return
	}

	// Process marks immediately with grade calculation
	for _, mark := range validMarks {
		// Check if result already exists
		var result models.SubjectResult
		err := h.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ? AND paper = ?",
			mark.StudentID, subjectID, term, year, examType, paper).First(&result).Error

		// Get existing CA if available
		var existingCA *float64
		if result.RawMarks != nil {
			if ca, ok := result.RawMarks["ca"].(float64); ok {
				existingCA = &ca
			}
		}

		// Calculate grade using centralized service
		gradeResult, rawMarks, calcErr := h.gradeCalculationService.CalculateGradeForResult(
			class.Level,
			uuid.MustParse(mark.StudentID),
			uuid.MustParse(subjectID),
			term,
			year,
			mark.Exam,
			existingCA,
		)
		if calcErr != nil {
			errors = append(errors, fmt.Sprintf("Failed to calculate grade for %s: %v", mark.AdmissionNo, calcErr))
			continue
		}

		if err == gorm.ErrRecordNotFound {
			// Create new result
			result = models.SubjectResult{
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
			if err := h.db.Create(&result).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Failed to save exam marks for %s: %v", mark.AdmissionNo, err))
			}
		} else if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to check existing marks for %s: %v", mark.AdmissionNo, err))
		} else {
			// Update existing result
			result.RawMarks = rawMarks
			result.FinalGrade = gradeResult.FinalGrade
			result.ComputationReason = gradeResult.ComputationReason
			result.RuleVersionHash = gradeResult.RuleVersionHash
			if err := h.db.Save(&result).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Failed to update exam marks for %s: %v", mark.AdmissionNo, err))
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Exam marks imported successfully",
		"total_rows":   totalRows,
		"valid_rows":   len(validMarks),
		"invalid_rows": len(errors),
		"errors":       errors,
	})
}

// parseExamFile extracts and validates exam marks from Excel file
func (h *BulkExamMarksImportHandler) parseExamFile(file interface{}, schoolID string) ([]ExamMarkRow, []string, int) {
	var validMarks []ExamMarkRow
	var errors []string

	// Handle multipart.FileHeader type
	type FileOpener interface {
		Open() (multipart.File, error)
	}

	fileOpener, ok := file.(FileOpener)
	if !ok {
		errors = append(errors, "Invalid file type")
		return validMarks, errors, 0
	}

	src, err := fileOpener.Open()
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

	// Count actual data rows (skip first 4: title, instructions, empty, headers)
	dataRows := rows[4:]
	nonEmptyCount := 0
	for _, row := range dataRows {
		if len(row) > 0 && row[0] != "" {
			nonEmptyCount++
		}
	}
	totalRows := nonEmptyCount

	// Skip header rows (first 4 rows: title, instructions, empty, headers)
	for i, row := range rows[4:] {
		// Skip empty rows
		if len(row) == 0 || (len(row) > 0 && strings.TrimSpace(row[0]) == "") {
			continue
		}

		if len(row) < 3 {
			errors = append(errors, fmt.Sprintf("Row %d: Insufficient columns (expected: admission_no, student_name, exam)", i+5))
			continue
		}

		admissionNo := strings.TrimSpace(row[0])
		examStr := strings.TrimSpace(row[2])

		// Skip if admission number is empty
		if admissionNo == "" {
			continue
		}

		var student models.Student
		if err := h.db.Where("admission_no = ? AND school_id = ?", admissionNo, schoolID).First(&student).Error; err != nil {
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

// DownloadExamMarksTemplate generates Excel template for exam marks only
func (h *BulkExamMarksImportHandler) DownloadExamMarksTemplate(c *gin.Context) {
	classID := c.Query("class_id")
	subjectName := c.Query("subject_name")
	level := c.Query("level")
	year := c.Query("year")
	term := c.Query("term")
	examType := c.Query("exam_type")
	paperStr := c.Query("paper")

	f := excelize.NewFile()
	defer f.Close()

	sheet := "Exam Marks"
	f.SetSheetName("Sheet1", sheet)

	// Title
	title := "EXAM MARKS IMPORT TEMPLATE"
	if subjectName != "" {
		title = fmt.Sprintf("%s - %s", title, subjectName)
	}
	if level != "" {
		title = fmt.Sprintf("%s (%s)", title, level)
	}
	if year != "" && term != "" {
		title = fmt.Sprintf("%s - %s %s", title, year, term)
	}
	if examType != "" {
		title = fmt.Sprintf("%s - %s", title, examType)
	}
	if paperStr != "" && paperStr != "0" {
		title = fmt.Sprintf("%s Paper %s", title, paperStr)
	}

	f.SetCellValue(sheet, "A1", title)
	f.MergeCell(sheet, "A1", "C1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, "A1", "C1", titleStyle)

	// Instructions
	f.SetCellValue(sheet, "A2", "Instructions: Enter exam marks only. Do NOT include AOI marks here.")
	f.MergeCell(sheet, "A2", "C2")
	instructionStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Italic: true, Color: "FF0000"},
	})
	f.SetCellStyle(sheet, "A2", "C2", instructionStyle)

	// Headers
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

	// Add students if class_id provided
	if classID != "" {
		schoolID := c.GetString("tenant_school_id")
		var students []models.Student
		h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
			Where("enrollments.class_id = ? AND students.school_id = ? AND enrollments.status = 'active'", classID, schoolID).
			Order("students.first_name ASC, students.last_name ASC").
			Find(&students)

		for i, student := range students {
			row := i + 5
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), student.AdmissionNo)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s %s", student.FirstName, student.LastName))
		}
	}

	f.SetColWidth(sheet, "A", "A", 15)
	f.SetColWidth(sheet, "B", "B", 30)
	f.SetColWidth(sheet, "C", "C", 12)

	filename := "exam_marks_template.xlsx"
	if subjectName != "" && level != "" {
		filename = fmt.Sprintf("exam_marks_%s_%s.xlsx", level, subjectName)
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate template"})
	}
}



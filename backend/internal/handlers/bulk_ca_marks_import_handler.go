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
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type BulkCAMarksImportHandler struct {
	db *gorm.DB
}

func NewBulkCAMarksImportHandler(db *gorm.DB) *BulkCAMarksImportHandler {
	return &BulkCAMarksImportHandler{db: db}
}

type CAMarkRow struct {
	StudentID   string  `json:"student_id"`
	AdmissionNo string  `json:"admission_no"`
	StudentName string  `json:"student_name"`
	CA          float64 `json:"ca"`
}

// ValidateCAMarks validates Excel file without saving
func (h *BulkCAMarksImportHandler) ValidateCAMarks(c *gin.Context) {
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

	var class models.Class
	if err := h.db.Where("id = ? AND school_id = ?", classID, schoolID).First(&class).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	if class.Level == "S1" || class.Level == "S2" || class.Level == "S3" || class.Level == "S4" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "S1-S4 use AOI marks, not CA marks. Use AOI import instead."})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	validMarks, errors, totalRows := h.parseCAFile(file, schoolID, class)

	c.JSON(http.StatusOK, gin.H{
		"total_rows":   totalRows,
		"valid_rows":   len(validMarks),
		"invalid_rows": len(errors),
		"valid_marks":  validMarks,
		"errors":       errors,
	})
}

// UploadCAMarksForApproval handles Excel upload for CA marks only
func (h *BulkCAMarksImportHandler) UploadCAMarksForApproval(c *gin.Context) {
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

	year, _ := strconv.Atoi(yearStr)

	var class models.Class
	if err := h.db.Where("id = ? AND school_id = ?", classID, schoolID).First(&class).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	if class.Level == "S1" || class.Level == "S2" || class.Level == "S3" || class.Level == "S4" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "S1-S4 use AOI marks, not CA marks. Use AOI import instead."})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	validMarks, errors, totalRows := h.parseCAFile(file, schoolID, class)

	// Process marks immediately (no approval needed)
	for _, mark := range validMarks {
		var result models.SubjectResult
		err := h.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ?",
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
			if err := h.db.Create(&result).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Failed to save CA marks for %s: %v", mark.AdmissionNo, err))
			}
		} else if err != nil {
			errors = append(errors, fmt.Sprintf("Database error for %s: %v", mark.AdmissionNo, err))
		} else {
			if result.RawMarks == nil {
				result.RawMarks = make(models.JSONB)
			}
			result.RawMarks["ca"] = mark.CA
			if err := h.db.Save(&result).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Failed to update CA marks for %s: %v", mark.AdmissionNo, err))
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "CA marks imported successfully",
		"total_rows":   totalRows,
		"valid_rows":   len(validMarks),
		"invalid_rows": len(errors),
		"errors":       errors,
	})
}

// parseCAFile extracts and validates CA marks from Excel file
func (h *BulkCAMarksImportHandler) parseCAFile(file interface{}, schoolID string, class models.Class) ([]CAMarkRow, []string, int) {
	var validMarks []CAMarkRow
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

	// Count actual data rows (skip first 4: title, instructions, headers, empty)
	dataRows := rows[4:]
	nonEmptyCount := 0
	for _, row := range dataRows {
		if len(row) > 0 && row[0] != "" {
			nonEmptyCount++
		}
	}
	totalRows := nonEmptyCount

	// Skip header rows (first 4 rows: title, instructions, headers, empty)
	for i, row := range rows[4:] {
		// Skip empty rows
		if len(row) == 0 || (len(row) > 0 && strings.TrimSpace(row[0]) == "") {
			continue
		}

		if len(row) < 3 {
			errors = append(errors, fmt.Sprintf("Row %d: Insufficient columns (expected: admission_no, student_name, ca)", i+5))
			continue
		}

		admissionNo := strings.TrimSpace(row[0])
		caStr := strings.TrimSpace(row[2])

		// Skip if admission number is empty
		if admissionNo == "" {
			continue
		}

		var student models.Student
		if err := h.db.Where("admission_no = ? AND school_id = ?", admissionNo, schoolID).First(&student).Error; err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Student %s not found", i+5, admissionNo))
			continue
		}

		ca, err := strconv.ParseFloat(caStr, 64)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Invalid CA mark '%s'", i+5, caStr))
			continue
		}

		maxCA := 40.0
		if class.Level == "Baby" || class.Level == "Middle" || class.Level == "Top" || class.Level == "Nursery" {
			maxCA = 100.0
		}

		if ca < 0 || ca > maxCA {
			errors = append(errors, fmt.Sprintf("Row %d: CA mark %.1f out of range (0-%.0f)", i+5, ca, maxCA))
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

// DownloadCAMarksTemplate generates Excel template for CA marks only
func (h *BulkCAMarksImportHandler) DownloadCAMarksTemplate(c *gin.Context) {
	classID := c.Query("class_id")
	subjectName := c.Query("subject_name")
	level := c.Query("level")
	year := c.Query("year")
	term := c.Query("term")
	examType := c.Query("exam_type")

	f := excelize.NewFile()
	defer f.Close()

	sheet := "CA Marks"
	f.SetSheetName("Sheet1", sheet)

	// Title
	title := "CA MARKS IMPORT TEMPLATE"
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

	f.SetCellValue(sheet, "A1", title)
	f.MergeCell(sheet, "A1", "C1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, "A1", "C1", titleStyle)

	// Instructions
	maxCA := "40"
	if level == "Baby" || level == "Middle" || level == "Top" || level == "Nursery" {
		maxCA = "100"
	}
	instructions := fmt.Sprintf("Instructions: Enter CA marks only (0-%s). Do NOT include exam marks here.", maxCA)
	f.SetCellValue(sheet, "A2", instructions)
	f.MergeCell(sheet, "A2", "C2")
	instructionStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Italic: true, Color: "FF0000"},
	})
	f.SetCellStyle(sheet, "A2", "C2", instructionStyle)

	// Headers
	headers := []string{"admission_no", "student_name", "ca"}
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
			Order("students.first_name, students.last_name").
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

	filename := "ca_marks_template.xlsx"
	if subjectName != "" && level != "" {
		filename = fmt.Sprintf("ca_marks_%s_%s.xlsx", level, subjectName)
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate template"})
	}
}

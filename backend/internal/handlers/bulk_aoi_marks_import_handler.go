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

type BulkAOIMarksImportHandler struct {
	db *gorm.DB
}

func NewBulkAOIMarksImportHandler(db *gorm.DB) *BulkAOIMarksImportHandler {
	return &BulkAOIMarksImportHandler{db: db}
}

type AOIMarkRow struct {
	StudentID   string             `json:"student_id"`
	AdmissionNo string             `json:"admission_no"`
	StudentName string             `json:"student_name"`
	Activities  map[string]float64 `json:"activities"` // activity1: 2.5, activity2: 3.0, etc.
}

// ValidateAOIMarks validates Excel file without saving
func (h *BulkAOIMarksImportHandler) ValidateAOIMarks(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.PostForm("class_id")
	subjectID := c.PostForm("subject_id")
	term := c.PostForm("term")
	yearStr := c.PostForm("year")

	if classID == "" || subjectID == "" || term == "" || yearStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	year, _ := strconv.Atoi(yearStr)

	var class models.Class
	if err := h.db.Where("id = ? AND school_id = ?", classID, schoolID).First(&class).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	if class.Level != "S1" && class.Level != "S2" && class.Level != "S3" && class.Level != "S4" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "AOI marks are only for S1-S4 levels"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	validMarks, errors, totalRows := h.parseAOIFile(file, schoolID, classID, subjectID, term, year)

	c.JSON(http.StatusOK, gin.H{
		"total_rows":   totalRows,
		"valid_rows":   len(validMarks),
		"invalid_rows": len(errors),
		"valid_marks":  validMarks,
		"errors":       errors,
	})
}

// UploadAOIMarks handles Excel upload for AOI marks (S1-S4 only)
func (h *BulkAOIMarksImportHandler) UploadAOIMarks(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.PostForm("class_id")
	subjectID := c.PostForm("subject_id")
	term := c.PostForm("term")
	yearStr := c.PostForm("year")

	if classID == "" || subjectID == "" || term == "" || yearStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	year, _ := strconv.Atoi(yearStr)

	var class models.Class
	if err := h.db.Where("id = ? AND school_id = ?", classID, schoolID).First(&class).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	if class.Level != "S1" && class.Level != "S2" && class.Level != "S3" && class.Level != "S4" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "AOI marks are only for S1-S4 levels"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	validMarks, errors, totalRows := h.parseAOIFile(file, schoolID, classID, subjectID, term, year)

	// Process marks immediately
	for _, mark := range validMarks {
		marksJSONB := make(models.JSONB)
		for k, v := range mark.Activities {
			marksJSONB[k] = v
		}

		aoiRecord := models.IntegrationActivity{
			StudentID: uuid.MustParse(mark.StudentID),
			SubjectID: uuid.MustParse(subjectID),
			ClassID:   uuid.MustParse(classID),
			SchoolID:  uuid.MustParse(schoolID),
			Term:      term,
			Year:      year,
			Marks:     marksJSONB,
		}

		if err := h.db.Create(&aoiRecord).Error; err != nil {
			errors = append(errors, fmt.Sprintf("Failed to save AOI marks for %s: %v", mark.AdmissionNo, err))
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "AOI marks imported successfully",
		"total_rows":   totalRows,
		"valid_rows":   len(validMarks),
		"invalid_rows": len(errors),
		"errors":       errors,
	})
}

// parseAOIFile extracts and validates AOI marks from Excel file
func (h *BulkAOIMarksImportHandler) parseAOIFile(file interface{}, schoolID, _, _, _ string, _ int) ([]AOIMarkRow, []string, int) {
	var validMarks []AOIMarkRow
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
	if err != nil || len(rows) < 6 {
		errors = append(errors, "Invalid file format or no data rows")
		return validMarks, errors, 0
	}

	// Count actual data rows (skip first 6: title, instructions, empty, headers, max labels, empty)
	dataRows := rows[6:]
	nonEmptyCount := 0
	for _, row := range dataRows {
		if len(row) > 0 && row[0] != "" {
			nonEmptyCount++
		}
	}
	totalRows := nonEmptyCount

	// Skip header rows (first 6 rows: title, instructions, empty, headers, max labels, empty)
	for i, row := range rows[6:] {
		// Skip empty rows
		if len(row) == 0 || (len(row) > 0 && strings.TrimSpace(row[0]) == "") {
			continue
		}

		// Need at least admission_no and name (columns 0-1)
		if len(row) < 2 {
			errors = append(errors, fmt.Sprintf("Row %d: Insufficient columns (expected at least admission_no and name)", i+7))
			continue
		}

		admissionNo := strings.TrimSpace(row[0])

		// Skip if admission number is empty
		if admissionNo == "" {
			continue
		}

		var student models.Student
		if err := h.db.Where("admission_no = ? AND school_id = ?", admissionNo, schoolID).First(&student).Error; err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Student %s not found", i+7, admissionNo))
			continue
		}

		activities := make(map[string]float64)
		hasError := false

		for j := 1; j <= 5; j++ {
			// Check if column exists in row
			if j+1 >= len(row) {
				continue // Activity column doesn't exist, skip
			}

			activityStr := strings.TrimSpace(row[j+1])
			if activityStr == "" {
				continue
			}

			mark, err := strconv.ParseFloat(activityStr, 64)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Row %d: Invalid activity%d mark '%s'", i+7, j, activityStr))
				hasError = true
				break
			}

			if mark < 0 || mark > 3 {
				errors = append(errors, fmt.Sprintf("Row %d: Activity%d mark %.1f out of range (0-3)", i+7, j, mark))
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

// DownloadAOIMarksTemplate generates Excel template for AOI marks
func (h *BulkAOIMarksImportHandler) DownloadAOIMarksTemplate(c *gin.Context) {
	classID := c.Query("class_id")
	subjectName := c.Query("subject_name")
	level := c.Query("level")
	year := c.Query("year")
	term := c.Query("term")

	// Verify this is for S1-S4
	if level != "" && level != "S1" && level != "S2" && level != "S3" && level != "S4" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "AOI marks template is only for S1-S4 levels"})
		return
	}

	f := excelize.NewFile()
	defer f.Close()

	sheet := "AOI Marks"
	f.SetSheetName("Sheet1", sheet)

	// Title
	title := "ACTIVITY OF INTEGRATION (AOI) MARKS TEMPLATE"
	if subjectName != "" {
		title = fmt.Sprintf("%s - %s", title, subjectName)
	}
	if level != "" {
		title = fmt.Sprintf("%s (%s)", title, level)
	}
	if year != "" && term != "" {
		title = fmt.Sprintf("%s - %s %s", title, year, term)
	}

	f.SetCellValue(sheet, "A1", title)
	f.MergeCell(sheet, "A1", "G1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, "A1", "G1", titleStyle)

	// Instructions
	instructions := "Instructions: Enter marks for 5 activities (0-3 marks each). Leave blank if activity not done."
	f.SetCellValue(sheet, "A2", instructions)
	f.MergeCell(sheet, "A2", "G2")
	instructionStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Italic: true, Color: "FF0000"},
	})
	f.SetCellStyle(sheet, "A2", "G2", instructionStyle)

	// Headers
	headers := []string{"admission_no", "student_name", "activity1", "activity2", "activity3", "activity4", "activity5"}
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

	// Add note row
	f.SetCellValue(sheet, "C5", "Max: 3")
	f.SetCellValue(sheet, "D5", "Max: 3")
	f.SetCellValue(sheet, "E5", "Max: 3")
	f.SetCellValue(sheet, "F5", "Max: 3")
	f.SetCellValue(sheet, "G5", "Max: 3")
	noteStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Italic: true, Size: 9, Color: "808080"},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, "C5", "G5", noteStyle)

	// Add students if class_id provided
	if classID != "" {
		schoolID := c.GetString("tenant_school_id")
		var students []models.Student
		h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
			Where("enrollments.class_id = ? AND students.school_id = ? AND enrollments.status = 'active'", classID, schoolID).
			Order("students.first_name, students.last_name").
			Find(&students)

		for i, student := range students {
			row := i + 6
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), student.AdmissionNo)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s %s", student.FirstName, student.LastName))
		}
	}

	f.SetColWidth(sheet, "A", "A", 15)
	f.SetColWidth(sheet, "B", "B", 30)
	f.SetColWidth(sheet, "C", "G", 12)

	filename := "aoi_marks_template.xlsx"
	if subjectName != "" && level != "" {
		filename = fmt.Sprintf("aoi_marks_%s_%s.xlsx", level, subjectName)
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate template"})
	}
}

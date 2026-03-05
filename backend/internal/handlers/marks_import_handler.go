package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type MarksImportHandler struct {
	db *gorm.DB
}

func NewMarksImportHandler(db *gorm.DB) *MarksImportHandler {
	return &MarksImportHandler{db: db}
}

// BulkImportMarks handles Excel file upload and imports marks
func (h *MarksImportHandler) BulkImportMarks(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer src.Close()

	// Read Excel file
	f, err := excelize.OpenReader(src)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Excel file"})
		return
	}
	defer f.Close()

	// Get first sheet
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No sheets found in file"})
		return
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil || len(rows) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file format"})
		return
	}

	// Validate headers
	headers := rows[0]
	expectedHeaders := []string{"admission_no", "student_name", "class", "subject", "assessment", "term", "year", "bot", "mot", "eot"}
	if len(headers) < len(expectedHeaders) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid headers. Expected: admission_no, student_name, class, subject, assessment, term, year, bot, mot, eot"})
		return
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
		subject := row[3]
		term := row[5]
		yearStr := row[6]
		botStr := row[7]
		motStr := row[8]
		eotStr := row[9]

		// Find student
		var student models.Student
		if err := h.db.Where("admission_no = ? AND school_id = ?", admissionNo, schoolID).First(&student).Error; err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Student %s not found", i+2, admissionNo))
			errorCount++
			continue
		}

		// Parse marks
		bot, _ := strconv.ParseFloat(botStr, 64)
		mot, _ := strconv.ParseFloat(motStr, 64)
		eot, _ := strconv.ParseFloat(eotStr, 64)
		year, _ := strconv.Atoi(yearStr)

		// Find or create assessment for each type
		assessmentTypes := []string{"BOT", "MOT", "EOT"}
		marks := []float64{bot, mot, eot}

		for i, assessmentType := range assessmentTypes {
			if marks[i] == 0 {
				continue // Skip if mark is 0
			}

			// Find subject ID
			var standardSubject models.StandardSubject
			if err := h.db.Where("code = ?", subject).First(&standardSubject).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Row %d: Subject %s not found", i+2, subject))
				errorCount++
				continue
			}

			// Find class ID
			var class models.Class
			if err := h.db.Where("name = ? AND school_id = ?", row[2], schoolID).First(&class).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Row %d: Class not found", i+2))
				errorCount++
				continue
			}

			// Find or create assessment
			var assessment models.Assessment
			err := h.db.Where("school_id = ? AND class_id = ? AND subject_id = ? AND assessment_type = ? AND term = ? AND year = ?",
				schoolID, class.ID, standardSubject.ID, assessmentType, term, year).First(&assessment).Error

			if err == gorm.ErrRecordNotFound {
				// Create assessment
				assessment = models.Assessment{
					SchoolID:       uuid.MustParse(schoolID),
					ClassID:        class.ID,
					SubjectID:      standardSubject.ID,
					AssessmentType: assessmentType,
					MaxMarks:       100,
					Term:           term,
					Year:           year,
					CreatedBy:      uuid.MustParse(userID),
				}
				if err := h.db.Create(&assessment).Error; err != nil {
					errors = append(errors, fmt.Sprintf("Row %d: Failed to create assessment", i+2))
					errorCount++
					continue
				}
			}

			// Create or update mark
			var mark models.Mark
			err = h.db.Where("assessment_id = ? AND student_id = ?", assessment.ID, student.ID).First(&mark).Error

			if err == gorm.ErrRecordNotFound {
				// Create new mark
				mark = models.Mark{
					AssessmentID:  assessment.ID,
					StudentID:     student.ID,
					MarksObtained: marks[i],
					EnteredBy:     uuid.MustParse(userID),
					EnteredAt:     time.Now(),
				}
				if err := h.db.Create(&mark).Error; err != nil {
					errors = append(errors, fmt.Sprintf("Row %d: Failed to create mark", i+2))
					errorCount++
					continue
				}
			} else {
				// Update existing mark
				mark.MarksObtained = marks[i]
				if err := h.db.Save(&mark).Error; err != nil {
					errors = append(errors, fmt.Sprintf("Row %d: Failed to update mark", i+2))
					errorCount++
					continue
				}
			}
		}

		successCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Import completed",
		"success_count": successCount,
		"error_count":   errorCount,
		"errors":        errors,
	})
}

// DownloadTemplate generates and downloads the Excel template
func (h *MarksImportHandler) DownloadTemplate(c *gin.Context) {
	f := excelize.NewFile()
	defer f.Close()

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

	// Set column widths
	f.SetColWidth(sheet, "A", "J", 15)

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=marks_import_template.xlsx")

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate template"})
	}
}

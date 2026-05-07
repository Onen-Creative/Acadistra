package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
	"github.com/xuri/excelize/v2"
)

type BulkCAMarksImportHandler struct {
	service *services.BulkCAMarksService
}

func NewBulkCAMarksImportHandler(service *services.BulkCAMarksService) *BulkCAMarksImportHandler {
	return &BulkCAMarksImportHandler{
		service: service,
	}
}

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

	class, err := h.service.ValidateClass(classID, schoolID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	validMarks, errors, totalRows := h.service.ParseCAFile(file, schoolID, *class)

	c.JSON(http.StatusOK, gin.H{
		"total_rows":   totalRows,
		"valid_rows":   len(validMarks),
		"invalid_rows": len(errors),
		"valid_marks":  validMarks,
		"errors":       errors,
	})
}

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

	class, err := h.service.ValidateClass(classID, schoolID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	validMarks, errors, totalRows := h.service.ParseCAFile(file, schoolID, *class)
	importErrors := h.service.ImportCAMarks(validMarks, classID, subjectID, schoolID, term, year, examType, class.Level)
	errors = append(errors, importErrors...)

	c.JSON(http.StatusOK, gin.H{
		"message":      "CA marks imported successfully",
		"total_rows":   totalRows,
		"valid_rows":   len(validMarks),
		"invalid_rows": len(errors),
		"errors":       errors,
	})
}

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

	if classID != "" {
		schoolID := c.GetString("tenant_school_id")
		students, _ := h.service.GetStudentsForTemplate(classID, schoolID)

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

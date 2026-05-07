package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type BulkExamMarksImportHandler struct {
	service *services.BulkExamMarksImportService
}

func NewBulkExamMarksImportHandler(service *services.BulkExamMarksImportService) *BulkExamMarksImportHandler {
	return &BulkExamMarksImportHandler{service: service}
}

func (h *BulkExamMarksImportHandler) ValidateExamMarks(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	result, err := h.service.ValidateExamMarks(file, schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

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

	result, err := h.service.ImportExamMarks(file, schoolID, classID, subjectID, term, year, paper, examType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}



func (h *BulkExamMarksImportHandler) DownloadExamMarksTemplate(c *gin.Context) {
	classID := c.Query("class_id")
	schoolID := c.GetString("tenant_school_id")

	f, err := h.service.GenerateTemplate(classID, schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate template"})
		return
	}
	defer f.Close()

	subjectName := c.Query("subject_name")
	level := c.Query("level")
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



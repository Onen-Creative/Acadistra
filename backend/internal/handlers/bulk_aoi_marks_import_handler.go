package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type BulkAOIMarksImportHandler struct {
	service *services.BulkAOIMarksImportService
}

func NewBulkAOIMarksImportHandler(service *services.BulkAOIMarksImportService) *BulkAOIMarksImportHandler {
	return &BulkAOIMarksImportHandler{service: service}
}

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

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	result, err := h.service.ValidateAOIMarks(file, schoolID, classID, subjectID, term, year)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

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

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	result, err := h.service.ImportAOIMarks(file, schoolID, classID, subjectID, term, year)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}



func (h *BulkAOIMarksImportHandler) DownloadAOIMarksTemplate(c *gin.Context) {
	classID := c.Query("class_id")
	schoolID := c.GetString("tenant_school_id")
	level := c.Query("level")

	f, err := h.service.GenerateTemplate(classID, schoolID, level)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	defer f.Close()

	subjectName := c.Query("subject_name")
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



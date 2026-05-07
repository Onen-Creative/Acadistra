package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
	"github.com/xuri/excelize/v2"
)

type MarksImportHandler struct {
	service *services.MarksImportService
}

func NewMarksImportHandler(service *services.MarksImportService) *MarksImportHandler {
	return &MarksImportHandler{service: service}
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

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Excel file"})
		return
	}
	defer f.Close()

	result, err := h.service.ProcessExcelFile(f, schoolID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Import completed",
		"success_count": result.SuccessCount,
		"error_count":   result.ErrorCount,
		"errors":        result.Errors,
	})
}

// DownloadTemplate generates and downloads the Excel template
func (h *MarksImportHandler) DownloadTemplate(c *gin.Context) {
	f, err := h.service.GenerateTemplate()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate template"})
		return
	}
	defer f.Close()

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=marks_import_template.xlsx")

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate template"})
	}
}

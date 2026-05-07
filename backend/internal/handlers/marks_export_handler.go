package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type MarksExportHandler struct {
	service *services.MarksExportService
}

func NewMarksExportHandler(service *services.MarksExportService) *MarksExportHandler {
	return &MarksExportHandler{service: service}
}

// ExportClassMarks exports all students' marks for a specific class
func (h *MarksExportHandler) ExportClassMarks(c *gin.Context) {
	classID := c.Query("class_id")
	term := c.Query("term")
	year := c.Query("year")
	schoolID := c.GetString("tenant_school_id")

	if classID == "" || term == "" || year == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id, term, and year are required"})
		return
	}

	data, err := h.service.PrepareExportData(classID, schoolID, term, year)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	f, filename, err := h.service.GenerateExcelFile(data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Excel file"})
		return
	}
	defer f.Close()

	c.Writer.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Writer.Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Writer.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Writer.WriteHeader(http.StatusOK)

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write Excel file"})
	}
}

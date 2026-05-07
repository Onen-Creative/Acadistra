package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type ClassRankingHandler struct {
	service *services.ClassRankingService
}

func NewClassRankingHandler(service *services.ClassRankingService) *ClassRankingHandler {
	return &ClassRankingHandler{service: service}
}

// GetClassRanking returns ranked students for a specific class
func (h *ClassRankingHandler) GetClassRanking(c *gin.Context) {
	classID := c.Param("class_id")
	term := c.Query("term")
	year := c.Query("year")
	examType := c.DefaultQuery("exam_type", "EOT")

	if term == "" || year == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "term and year are required"})
		return
	}

	response, err := h.service.GetClassRanking(classID, term, year, examType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ExportClassRanking exports class rankings to Excel
func (h *ClassRankingHandler) ExportClassRanking(c *gin.Context) {
	classID := c.Param("class_id")
	term := c.Query("term")
	year := c.Query("year")
	examType := c.DefaultQuery("exam_type", "EOT")

	if term == "" || year == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "term and year are required"})
		return
	}

	f, filename, err := h.service.ExportClassRanking(classID, term, year, examType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer f.Close()

	c.Writer.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Writer.Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Writer.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Writer.WriteHeader(http.StatusOK)

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Excel file"})
	}
}

// GetAvailableTermsYears returns available terms and years for a class
func (h *ClassRankingHandler) GetAvailableTermsYears(c *gin.Context) {
	classID := c.Param("class_id")

	termYears, err := h.service.GetAvailableTermsYears(classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch terms and years"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": termYears})
}

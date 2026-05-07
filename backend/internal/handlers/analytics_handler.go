package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/services"
)

type AnalyticsHandler struct {
	service       *services.AnalyticsService
	exportService *services.AnalyticsExportService
}

func NewAnalyticsHandler(service *services.AnalyticsService, exportService *services.AnalyticsExportService) *AnalyticsHandler {
	return &AnalyticsHandler{
		service:       service,
		exportService: exportService,
	}
}

func (h *AnalyticsHandler) GetStudentAnalytics(c *gin.Context) {
	schoolIDStr, exists := c.Get("school_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "School ID not found"})
		return
	}
	
	var schoolID uuid.UUID
	switch v := schoolIDStr.(type) {
	case uuid.UUID:
		schoolID = v
	case string:
		var err error
		schoolID, err = uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid school ID format"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid school ID type"})
		return
	}
	
	studentID, err := uuid.Parse(c.Param("student_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	filters := parseFilters(c)
	analytics, err := h.service.GetStudentPerformanceAnalytics(schoolID, studentID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

func (h *AnalyticsHandler) GetGradeAnalytics(c *gin.Context) {
	schoolIDStr, exists := c.Get("school_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "School ID not found"})
		return
	}
	
	var schoolID uuid.UUID
	switch v := schoolIDStr.(type) {
	case uuid.UUID:
		schoolID = v
	case string:
		var err error
		schoolID, err = uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid school ID format"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid school ID type"})
		return
	}
	
	filters := parseFilters(c)

	analytics, err := h.service.GetGradePerformanceAnalytics(schoolID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

func parseFilters(c *gin.Context) services.AnalyticsFilters {
	filters := services.AnalyticsFilters{}
	
	if year := c.Query("year"); year != "" {
		var y int
		if _, err := fmt.Sscanf(year, "%d", &y); err == nil {
			filters.Year = y
		}
	}
	
	if term := c.Query("term"); term != "" {
		filters.Term = term
	}
	
	if classID := c.Query("class_id"); classID != "" {
		if id, err := uuid.Parse(classID); err == nil {
			filters.ClassID = &id
		}
	}
	
	if subjectID := c.Query("subject_id"); subjectID != "" {
		if id, err := uuid.Parse(subjectID); err == nil {
			filters.SubjectID = &id
		}
	}
	
	if examType := c.Query("exam_type"); examType != "" {
		filters.ExamType = examType
	}
	
	return filters
}

func (h *AnalyticsHandler) ExportGradeAnalytics(c *gin.Context) {
	schoolIDStr, exists := c.Get("school_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "School ID not found"})
		return
	}
	
	var schoolID uuid.UUID
	switch v := schoolIDStr.(type) {
	case uuid.UUID:
		schoolID = v
	case string:
		var err error
		schoolID, err = uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid school ID format"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid school ID type"})
		return
	}
	
	filters := parseFilters(c)

	// Generate Excel file
	excelFile, err := h.exportService.ExportGradeAnalyticsToXLSX(schoolID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer excelFile.Close()

	// Generate filename
	filename := fmt.Sprintf("Analytics_%s_%s_%d.xlsx", 
		c.Query("class_name"), 
		filters.Term, 
		filters.Year)

	// Set headers for file download
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Transfer-Encoding", "binary")

	// Write file to response
	if err := excelFile.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write Excel file"})
		return
	}
}

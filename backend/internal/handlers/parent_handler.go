package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type ParentHandler struct {
	service *services.ParentService
}

func NewParentHandler(service *services.ParentService) *ParentHandler {
	return &ParentHandler{service: service}
}

func (h *ParentHandler) GetDashboardSummary(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	students, summary, err := h.service.GetDashboardSummary(guardianPhone, schoolID, term, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dashboard"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"children": students,
		"summary":  summary,
	})
}

func (h *ParentHandler) GetChildDetails(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	details, err := h.service.GetChildDetails(guardianPhone, studentID, schoolID, term, year)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, details)
}

func (h *ParentHandler) GetChildAttendance(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	attendance, periods, err := h.service.GetChildAttendance(guardianPhone, studentID, schoolID, term, year)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"attendance": attendance,
		"periods":    periods,
	})
}

func (h *ParentHandler) GetChildResults(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	results, err := h.service.GetChildResults(guardianPhone, studentID, schoolID, term, year)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

func (h *ParentHandler) GetChildFees(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	fees, payments, err := h.service.GetChildFees(guardianPhone, studentID, schoolID, term, year)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fees record not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"fees":     fees,
		"payments": payments,
	})
}

func (h *ParentHandler) GetChildHealth(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	health, visits, err := h.service.GetChildHealth(guardianPhone, studentID, schoolID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"health_profile": health,
		"recent_visits":  visits,
	})
}

func (h *ParentHandler) GetChildReportCard(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	studentID := c.Param("student_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	reportCard, err := h.service.GetChildReportCard(guardianPhone, studentID, term, year)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report card not available"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"report_card": reportCard})
}

func (h *ParentHandler) GetChildTimetable(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	class, err := h.service.GetChildTimetable(guardianPhone, studentID, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not enrolled in any class"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"class":     class,
		"timetable": gin.H{"message": "Timetable feature coming soon"},
	})
}

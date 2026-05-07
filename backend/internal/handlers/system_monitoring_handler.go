package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type SystemMonitoringHandler struct {
	service *services.SystemMonitoringService
}

func NewSystemMonitoringHandler(service *services.SystemMonitoringService) *SystemMonitoringHandler {
	return &SystemMonitoringHandler{service: service}
}

func (h *SystemMonitoringHandler) GetActiveUsers(c *gin.Context) {
	activeUsers, err := h.service.GetActiveUsersWithDetails()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total": len(activeUsers),
		"users": activeUsers,
	})
}

func (h *SystemMonitoringHandler) GetEnhancedAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	action := c.Query("action")
	schoolID := c.Query("school_id")
	userRole := c.Query("user_role")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	logs, total, err := h.service.GetEnhancedAuditLogs(page, limit, action, schoolID, userRole, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *SystemMonitoringHandler) GetSystemStats(c *gin.Context) {
	stats, err := h.service.GetSystemStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *SystemMonitoringHandler) GetDailyReports(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))

	reports, err := h.service.GetDailyReports(days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reports": reports,
		"days":    days,
	})
}

func (h *SystemMonitoringHandler) GetPerformanceMetrics(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))

	metrics, err := h.service.GetPerformanceMetrics(hours)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"metrics": metrics,
		"hours":   hours,
	})
}

func (h *SystemMonitoringHandler) GetSlowestEndpoints(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	stats, err := h.service.GetSlowestEndpoints(hours, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"endpoints": stats,
		"hours":     hours,
	})
}

func (h *SystemMonitoringHandler) GetErrorAnalysis(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))

	stats, err := h.service.GetErrorAnalysis(hours)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"errors": stats,
		"hours":  hours,
	})
}

func (h *SystemMonitoringHandler) GenerateDailyReport(c *gin.Context) {
	dateStr := c.DefaultQuery("date", time.Now().AddDate(0, 0, -1).Format("2006-01-02"))
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	if err := h.service.GenerateDailyReport(date); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Daily report generated successfully", "date": dateStr})
}

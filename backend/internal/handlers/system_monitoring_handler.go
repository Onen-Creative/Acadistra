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

func (h *SystemMonitoringHandler) GetSystemHealth(c *gin.Context) {
	// Get comprehensive system health metrics
	activeUsers, _ := h.service.GetActiveUsers()
	activeSessions, _ := h.service.GetActiveSessions()
	
	// Get metrics from last hour
	var metrics struct {
		Total   int64
		Errors  int64
		AvgTime float64
	}
	
	h.service.DB().Raw(`
		SELECT 
			COUNT(*) as total,
			COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors,
			COALESCE(AVG(response_time), 0) as avg_time
		FROM api_request_logs
		WHERE timestamp > NOW() - INTERVAL '1 hour'
	`).Scan(&metrics)
	
	var slowest struct {
		Path string
		Time float64
	}
	h.service.DB().Raw(`
		SELECT path, response_time as time
		FROM api_request_logs
		WHERE timestamp > NOW() - INTERVAL '1 hour'
		ORDER BY response_time DESC
		LIMIT 1
	`).Scan(&slowest)
	
	errorRate := 0.0
	if metrics.Total > 0 {
		errorRate = float64(metrics.Errors) / float64(metrics.Total) * 100
	}
	
	// System status based on metrics
	status := "healthy"
	if errorRate > 10 {
		status = "degraded"
	} else if errorRate > 20 {
		status = "unhealthy"
	}
	if metrics.AvgTime > 1000 {
		status = "slow"
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status":              status,
		"timestamp":           time.Now(),
		"active_users":        activeUsers,
		"active_sessions":     activeSessions,
		"requests_last_hour":  metrics.Total,
		"errors_last_hour":    metrics.Errors,
		"error_rate":          errorRate,
		"avg_response_time":   metrics.AvgTime,
		"slowest_endpoint":    slowest.Path,
		"max_response_time":   slowest.Time,
		"uptime":              time.Since(startTime).Seconds(),
	})
}

var startTime = time.Now()

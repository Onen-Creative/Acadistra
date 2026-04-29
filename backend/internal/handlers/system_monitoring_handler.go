package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type SystemMonitoringHandler struct {
	db                 *gorm.DB
	monitoringService  *services.SystemMonitoringService
}

func NewSystemMonitoringHandler(db *gorm.DB, monitoringService *services.SystemMonitoringService) *SystemMonitoringHandler {
	return &SystemMonitoringHandler{
		db:                db,
		monitoringService: monitoringService,
	}
}

// GetActiveUsers returns currently logged in users
func (h *SystemMonitoringHandler) GetActiveUsers(c *gin.Context) {
	type ActiveUserInfo struct {
		UserID       string    `json:"user_id"`
		UserName     string    `json:"user_name"`
		UserEmail    string    `json:"user_email"`
		UserRole     string    `json:"user_role"`
		SchoolID     *string   `json:"school_id"`
		SchoolName   *string   `json:"school_name"`
		IPAddress    string    `json:"ip_address"`
		LoginAt      time.Time `json:"login_at"`
		LastActivity time.Time `json:"last_activity"`
	}

	var activeUsers []ActiveUserInfo
	err := h.db.Raw(`
		SELECT 
			us.user_id,
			u.full_name as user_name,
			u.email as user_email,
			u.role as user_role,
			us.school_id,
			s.name as school_name,
			us.ip_address,
			us.login_at,
			us.last_activity
		FROM user_sessions us
		INNER JOIN users u ON us.user_id = u.id
		LEFT JOIN schools s ON us.school_id = s.id
		WHERE us.is_active = true AND us.last_activity > ?
		ORDER BY us.last_activity DESC
	`, time.Now().Add(-30*time.Minute)).Scan(&activeUsers).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total": len(activeUsers),
		"users": activeUsers,
	})
}

// GetEnhancedAuditLogs returns audit logs with full details
func (h *SystemMonitoringHandler) GetEnhancedAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	action := c.Query("action")
	schoolID := c.Query("school_id")
	userRole := c.Query("user_role")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	offset := (page - 1) * limit

	type AuditLogDetail struct {
		models.AuditLog
		UserName   string  `json:"user_name"`
		UserEmail  string  `json:"user_email"`
		SchoolName *string `json:"school_name"`
		ClassName  *string `json:"class_name"`
	}

	query := h.db.Table("audit_logs").
		Select(`
			audit_logs.*,
			users.full_name as user_name,
			users.email as user_email,
			schools.name as school_name,
			classes.name as class_name
		`).
		Joins("LEFT JOIN users ON audit_logs.actor_user_id = users.id").
		Joins("LEFT JOIN schools ON audit_logs.school_id = schools.id").
		Joins("LEFT JOIN classes ON audit_logs.class_id = classes.id")

	if action != "" {
		query = query.Where("audit_logs.action = ?", action)
	}
	if schoolID != "" {
		query = query.Where("audit_logs.school_id = ?", schoolID)
	}
	if userRole != "" {
		query = query.Where("audit_logs.user_role = ?", userRole)
	}
	if startDate != "" {
		query = query.Where("audit_logs.timestamp >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("audit_logs.timestamp <= ?", endDate)
	}

	var total int64
	query.Count(&total)

	var logs []AuditLogDetail
	err := query.Order("audit_logs.timestamp DESC").
		Limit(limit).
		Offset(offset).
		Scan(&logs).Error

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

// GetSystemStats returns current system statistics
func (h *SystemMonitoringHandler) GetSystemStats(c *gin.Context) {
	activeUsers, _ := h.monitoringService.GetActiveUsers()
	activeSessions, _ := h.monitoringService.GetActiveSessions()

	// Get request stats for last hour
	var requestsLastHour, errorsLastHour int64
	var avgResponseTime float64
	h.db.Model(&models.APIRequestLog{}).
		Where("timestamp > ?", time.Now().Add(-1*time.Hour)).
		Count(&requestsLastHour)
	h.db.Model(&models.APIRequestLog{}).
		Where("timestamp > ? AND status_code >= 400", time.Now().Add(-1*time.Hour)).
		Count(&errorsLastHour)
	h.db.Model(&models.APIRequestLog{}).
		Where("timestamp > ?", time.Now().Add(-1*time.Hour)).
		Select("AVG(response_time)").
		Scan(&avgResponseTime)

	errorRate := 0.0
	if requestsLastHour > 0 {
		errorRate = float64(errorsLastHour) / float64(requestsLastHour) * 100
	}

	// Get school activity
	schoolActivity, _ := h.monitoringService.GetActiveSessionsBySchool()

	c.JSON(http.StatusOK, gin.H{
		"active_users":         activeUsers,
		"active_sessions":      activeSessions,
		"requests_last_hour":   requestsLastHour,
		"errors_last_hour":     errorsLastHour,
		"error_rate":           errorRate,
		"avg_response_time_ms": avgResponseTime,
		"school_activity":      schoolActivity,
		"timestamp":            time.Now(),
	})
}

// GetDailyReports returns daily system reports
func (h *SystemMonitoringHandler) GetDailyReports(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))

	var reports []models.DailySystemReport
	err := h.db.Where("date >= ?", time.Now().AddDate(0, 0, -days)).
		Order("date DESC").
		Find(&reports).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reports": reports,
		"days":    days,
	})
}

// GetPerformanceMetrics returns system performance metrics
func (h *SystemMonitoringHandler) GetPerformanceMetrics(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))

	var metrics []models.SystemMetric
	err := h.db.Where("timestamp > ?", time.Now().Add(-time.Duration(hours)*time.Hour)).
		Order("timestamp DESC").
		Find(&metrics).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"metrics": metrics,
		"hours":   hours,
	})
}

// GetSlowestEndpoints returns slowest API endpoints
func (h *SystemMonitoringHandler) GetSlowestEndpoints(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	type EndpointStats struct {
		Path            string  `json:"path"`
		AvgResponseTime float64 `json:"avg_response_time_ms"`
		MaxResponseTime float64 `json:"max_response_time_ms"`
		RequestCount    int64   `json:"request_count"`
	}

	var stats []EndpointStats
	err := h.db.Raw(`
		SELECT 
			path,
			AVG(response_time) as avg_response_time,
			MAX(response_time) as max_response_time,
			COUNT(*) as request_count
		FROM api_request_logs
		WHERE timestamp > ?
		GROUP BY path
		ORDER BY avg_response_time DESC
		LIMIT ?
	`, time.Now().Add(-time.Duration(hours)*time.Hour), limit).Scan(&stats).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"endpoints": stats,
		"hours":     hours,
	})
}

// GetErrorAnalysis returns error analysis
func (h *SystemMonitoringHandler) GetErrorAnalysis(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))

	type ErrorStats struct {
		Path        string `json:"path"`
		StatusCode  int    `json:"status_code"`
		ErrorCount  int64  `json:"error_count"`
		LastOccured string `json:"last_occured"`
	}

	var stats []ErrorStats
	err := h.db.Raw(`
		SELECT 
			path,
			status_code,
			COUNT(*) as error_count,
			MAX(timestamp) as last_occured
		FROM api_request_logs
		WHERE timestamp > ? AND status_code >= 400
		GROUP BY path, status_code
		ORDER BY error_count DESC
		LIMIT 20
	`, time.Now().Add(-time.Duration(hours)*time.Hour)).Scan(&stats).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"errors": stats,
		"hours":  hours,
	})
}

// GenerateDailyReport manually triggers daily report generation
func (h *SystemMonitoringHandler) GenerateDailyReport(c *gin.Context) {
	dateStr := c.DefaultQuery("date", time.Now().AddDate(0, 0, -1).Format("2006-01-02"))
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	if err := h.monitoringService.GenerateDailyReport(date); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Daily report generated successfully", "date": dateStr})
}

package services

import (
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type SystemMonitoringService struct {
	db *gorm.DB
}

func NewSystemMonitoringService(db *gorm.DB) *SystemMonitoringService {
	return &SystemMonitoringService{db: db}
}

// CreateSession creates a new user session
func (s *SystemMonitoringService) CreateSession(userID uuid.UUID, schoolID *uuid.UUID, token, ip, userAgent string) error {
	session := &models.UserSession{
		UserID:       userID,
		SchoolID:     schoolID,
		Token:        token,
		IPAddress:    ip,
		UserAgent:    userAgent,
		LoginAt:      time.Now(),
		LastActivity: time.Now(),
		IsActive:     true,
	}
	return s.db.Create(session).Error
}

// UpdateSessionActivity updates the last activity timestamp
func (s *SystemMonitoringService) UpdateSessionActivity(token string) error {
	return s.db.Model(&models.UserSession{}).
		Where("token = ? AND is_active = ?", token, true).
		Update("last_activity", time.Now()).Error
}

// EndSession marks a session as inactive
func (s *SystemMonitoringService) EndSession(token string) error {
	now := time.Now()
	return s.db.Model(&models.UserSession{}).
		Where("token = ?", token).
		Updates(map[string]interface{}{
			"is_active": false,
			"logout_at": now,
		}).Error
}

// GetActiveSessions returns count of active sessions
func (s *SystemMonitoringService) GetActiveSessions() (int64, error) {
	var count int64
	err := s.db.Model(&models.UserSession{}).
		Where("is_active = ? AND last_activity > ?", true, time.Now().Add(-30*time.Minute)).
		Count(&count).Error
	return count, err
}

// GetActiveUsers returns count of unique active users
func (s *SystemMonitoringService) GetActiveUsers() (int64, error) {
	var count int64
	err := s.db.Model(&models.UserSession{}).
		Where("is_active = ? AND last_activity > ?", true, time.Now().Add(-30*time.Minute)).
		Distinct("user_id").
		Count(&count).Error
	return count, err
}

// GetActiveSessionsBySchool returns active sessions grouped by school
func (s *SystemMonitoringService) GetActiveSessionsBySchool() ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	err := s.db.Raw(`
		SELECT 
			s.id as school_id,
			s.name as school_name,
			COUNT(DISTINCT us.user_id) as active_users,
			COUNT(us.id) as active_sessions
		FROM user_sessions us
		LEFT JOIN schools s ON us.school_id = s.id
		WHERE us.is_active = true AND us.last_activity > ?
		GROUP BY s.id, s.name
		ORDER BY active_users DESC
	`, time.Now().Add(-30*time.Minute)).Scan(&results).Error
	return results, err
}

// LogAPIRequest logs an API request
func (s *SystemMonitoringService) LogAPIRequest(userID, schoolID *uuid.UUID, method, path string, statusCode int, responseTime float64, ip, userAgent, errorMsg string) error {
	log := &models.APIRequestLog{
		UserID:       userID,
		SchoolID:     schoolID,
		Method:       method,
		Path:         path,
		StatusCode:   statusCode,
		ResponseTime: responseTime,
		IPAddress:    ip,
		UserAgent:    userAgent,
		Timestamp:    time.Now(),
		ErrorMessage: errorMsg,
	}
	return s.db.Create(log).Error
}

// RecordSystemMetric records current system metrics
func (s *SystemMonitoringService) RecordSystemMetric() error {
	activeUsers, _ := s.GetActiveUsers()
	activeSessions, _ := s.GetActiveSessions()
	
	// Calculate average response time from last 5 minutes
	var avgResponseTime float64
	s.db.Model(&models.APIRequestLog{}).
		Where("timestamp > ?", time.Now().Add(-5*time.Minute)).
		Select("AVG(response_time)").
		Scan(&avgResponseTime)
	
	// Calculate error rate
	var totalRequests, errorRequests int64
	s.db.Model(&models.APIRequestLog{}).
		Where("timestamp > ?", time.Now().Add(-5*time.Minute)).
		Count(&totalRequests)
	s.db.Model(&models.APIRequestLog{}).
		Where("timestamp > ? AND status_code >= 400", time.Now().Add(-5*time.Minute)).
		Count(&errorRequests)
	
	errorRate := 0.0
	if totalRequests > 0 {
		errorRate = float64(errorRequests) / float64(totalRequests) * 100
	}
	
	metric := &models.SystemMetric{
		Timestamp:       time.Now(),
		ActiveUsers:     int(activeUsers),
		ActiveSessions:  int(activeSessions),
		TotalRequests:   int(totalRequests),
		AvgResponseTime: avgResponseTime,
		ErrorRate:       errorRate,
	}
	
	return s.db.Create(metric).Error
}

// GenerateDailyReport generates a daily system report
func (s *SystemMonitoringService) GenerateDailyReport(date time.Time) error {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)
	
	// Total and active users
	var totalUsers, activeUsers int64
	s.db.Model(&models.User{}).Where("role != ?", "system_admin").Count(&totalUsers)
	s.db.Model(&models.UserSession{}).
		Where("login_at >= ? AND login_at < ?", startOfDay, endOfDay).
		Distinct("user_id").
		Count(&activeUsers)
	
	// Session stats
	var totalSessions int64
	var avgDuration float64
	s.db.Model(&models.UserSession{}).
		Where("login_at >= ? AND login_at < ?", startOfDay, endOfDay).
		Count(&totalSessions)
	
	s.db.Raw(`
		SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(logout_at, last_activity) - login_at)) / 60)
		FROM user_sessions
		WHERE login_at >= ? AND login_at < ?
	`, startOfDay, endOfDay).Scan(&avgDuration)
	
	// Request stats
	var totalRequests, successfulRequests, failedRequests int64
	var avgResponseTime float64
	s.db.Model(&models.APIRequestLog{}).
		Where("timestamp >= ? AND timestamp < ?", startOfDay, endOfDay).
		Count(&totalRequests)
	s.db.Model(&models.APIRequestLog{}).
		Where("timestamp >= ? AND timestamp < ? AND status_code < 400", startOfDay, endOfDay).
		Count(&successfulRequests)
	s.db.Model(&models.APIRequestLog{}).
		Where("timestamp >= ? AND timestamp < ? AND status_code >= 400", startOfDay, endOfDay).
		Count(&failedRequests)
	s.db.Model(&models.APIRequestLog{}).
		Where("timestamp >= ? AND timestamp < ?", startOfDay, endOfDay).
		Select("AVG(response_time)").
		Scan(&avgResponseTime)
	
	// Slowest endpoint
	var slowestEndpoint struct {
		Path         string
		ResponseTime float64
	}
	s.db.Model(&models.APIRequestLog{}).
		Where("timestamp >= ? AND timestamp < ?", startOfDay, endOfDay).
		Select("path, MAX(response_time) as response_time").
		Group("path").
		Order("response_time DESC").
		Limit(1).
		Scan(&slowestEndpoint)
	
	// Peak hour
	var peakHour struct {
		Hour     int
		Requests int64
	}
	s.db.Raw(`
		SELECT EXTRACT(HOUR FROM timestamp) as hour, COUNT(*) as requests
		FROM api_request_logs
		WHERE timestamp >= ? AND timestamp < ?
		GROUP BY hour
		ORDER BY requests DESC
		LIMIT 1
	`, startOfDay, endOfDay).Scan(&peakHour)
	
	// Top errors
	var topErrors []map[string]interface{}
	s.db.Raw(`
		SELECT path, status_code, COUNT(*) as count
		FROM api_request_logs
		WHERE timestamp >= ? AND timestamp < ? AND status_code >= 400
		GROUP BY path, status_code
		ORDER BY count DESC
		LIMIT 10
	`, startOfDay, endOfDay).Scan(&topErrors)
	
	// School activity
	var schoolActivity []map[string]interface{}
	s.db.Raw(`
		SELECT 
			s.id, s.name,
			COUNT(DISTINCT us.user_id) as active_users,
			COUNT(DISTINCT us.id) as sessions,
			COUNT(al.id) as api_requests
		FROM schools s
		LEFT JOIN user_sessions us ON s.id = us.school_id AND us.login_at >= ? AND us.login_at < ?
		LEFT JOIN api_request_logs al ON s.id = al.school_id AND al.timestamp >= ? AND al.timestamp < ?
		GROUP BY s.id, s.name
		ORDER BY active_users DESC
	`, startOfDay, endOfDay, startOfDay, endOfDay).Scan(&schoolActivity)
	
	errorRate := 0.0
	if totalRequests > 0 {
		errorRate = float64(failedRequests) / float64(totalRequests) * 100
	}
	
	// Convert to JSONB
	topErrorsJSON := models.JSONB{}
	if len(topErrors) > 0 {
		topErrorsJSON["errors"] = topErrors
	}
	
	schoolActivityJSON := models.JSONB{}
	if len(schoolActivity) > 0 {
		schoolActivityJSON["schools"] = schoolActivity
	}
	
	report := &models.DailySystemReport{
		Date:                date,
		TotalUsers:          int(totalUsers),
		ActiveUsers:         int(activeUsers),
		TotalSessions:       int(totalSessions),
		AvgSessionDuration:  avgDuration,
		TotalRequests:       int(totalRequests),
		SuccessfulRequests:  int(successfulRequests),
		FailedRequests:      int(failedRequests),
		AvgResponseTime:     avgResponseTime,
		SlowestEndpoint:     slowestEndpoint.Path,
		SlowestResponseTime: slowestEndpoint.ResponseTime,
		PeakHour:            peakHour.Hour,
		PeakHourRequests:    int(peakHour.Requests),
		ErrorRate:           errorRate,
		TopErrors:           topErrorsJSON,
		SchoolActivity:      schoolActivityJSON,
	}
	
	return s.db.Create(report).Error
}

// CleanupOldLogs removes logs older than specified days
func (s *SystemMonitoringService) CleanupOldLogs(daysToKeep int) error {
	cutoffDate := time.Now().AddDate(0, 0, -daysToKeep)
	
	// Delete old API request logs
	if err := s.db.Where("timestamp < ?", cutoffDate).Delete(&models.APIRequestLog{}).Error; err != nil {
		return err
	}
	
	// Delete old system metrics
	if err := s.db.Where("timestamp < ?", cutoffDate).Delete(&models.SystemMetric{}).Error; err != nil {
		return err
	}
	
	// Delete old inactive sessions
	if err := s.db.Where("is_active = false AND logout_at < ?", cutoffDate).Delete(&models.UserSession{}).Error; err != nil {
		return err
	}
	
	return nil
}


func (s *SystemMonitoringService) GetActiveUsersWithDetails() ([]map[string]interface{}, error) {
	var activeUsers []map[string]interface{}
	err := s.db.Raw(`
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
	return activeUsers, err
}

func (s *SystemMonitoringService) GetEnhancedAuditLogs(page, limit int, action, schoolID, userRole, startDate, endDate string) ([]map[string]interface{}, int64, error) {
	offset := (page - 1) * limit

	query := s.db.Table("audit_logs").
		Select(`
			audit_logs.*,
			users.full_name as user_name,
			users.email as user_email,
			users.role as user_role,
			COALESCE(schools.name, user_schools.name) as school_name,
			classes.name as class_name,
			students.first_name as student_first_name,
			students.middle_name as student_middle_name,
			students.last_name as student_last_name,
			students.admission_no as student_admission_no
		`).
		Joins("LEFT JOIN users ON audit_logs.actor_user_id = users.id").
		Joins("LEFT JOIN schools ON audit_logs.school_id = schools.id").
		Joins("LEFT JOIN schools user_schools ON users.school_id = user_schools.id").
		Joins("LEFT JOIN classes ON audit_logs.class_id = classes.id").
		Joins("LEFT JOIN students ON audit_logs.resource_type = 'student' AND audit_logs.resource_id = students.id")

	if action != "" {
		query = query.Where("audit_logs.action = ?", action)
	}
	if schoolID != "" {
		query = query.Where("audit_logs.school_id = ?", schoolID)
	}
	if userRole != "" {
		query = query.Where("users.role = ?", userRole)
	}
	if startDate != "" {
		query = query.Where("audit_logs.timestamp >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("audit_logs.timestamp <= ?", endDate)
	}

	var total int64
	query.Count(&total)

	var logs []map[string]interface{}
	err := query.Order("audit_logs.timestamp DESC").
		Limit(limit).
		Offset(offset).
		Scan(&logs).Error

	return logs, total, err
}

func (s *SystemMonitoringService) GetSystemStats() (map[string]interface{}, error) {
	activeUsers, _ := s.GetActiveUsers()
	activeSessions, _ := s.GetActiveSessions()

	var requestsLastHour, errorsLastHour int64
	var avgResponseTime float64
	s.db.Model(&models.APIRequestLog{}).
		Where("timestamp > ?", time.Now().Add(-1*time.Hour)).
		Count(&requestsLastHour)
	s.db.Model(&models.APIRequestLog{}).
		Where("timestamp > ? AND status_code >= 400", time.Now().Add(-1*time.Hour)).
		Count(&errorsLastHour)
	s.db.Model(&models.APIRequestLog{}).
		Where("timestamp > ?", time.Now().Add(-1*time.Hour)).
		Select("AVG(response_time)").
		Scan(&avgResponseTime)

	errorRate := 0.0
	if requestsLastHour > 0 {
		errorRate = float64(errorsLastHour) / float64(requestsLastHour) * 100
	}

	schoolActivity, _ := s.GetActiveSessionsBySchool()

	return map[string]interface{}{
		"active_users":         activeUsers,
		"active_sessions":      activeSessions,
		"requests_last_hour":   requestsLastHour,
		"errors_last_hour":     errorsLastHour,
		"error_rate":           errorRate,
		"avg_response_time_ms": avgResponseTime,
		"school_activity":      schoolActivity,
		"timestamp":            time.Now(),
	}, nil
}

func (s *SystemMonitoringService) GetDailyReports(days int) ([]models.DailySystemReport, error) {
	var reports []models.DailySystemReport
	err := s.db.Where("date >= ?", time.Now().AddDate(0, 0, -days)).
		Order("date DESC").
		Find(&reports).Error
	return reports, err
}

func (s *SystemMonitoringService) GetPerformanceMetrics(hours int) ([]models.SystemMetric, error) {
	var metrics []models.SystemMetric
	err := s.db.Where("timestamp > ?", time.Now().Add(-time.Duration(hours)*time.Hour)).
		Order("timestamp DESC").
		Find(&metrics).Error
	return metrics, err
}

func (s *SystemMonitoringService) GetSlowestEndpoints(hours, limit int) ([]map[string]interface{}, error) {
	var stats []map[string]interface{}
	err := s.db.Raw(`
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
	return stats, err
}

func (s *SystemMonitoringService) GetErrorAnalysis(hours int) ([]map[string]interface{}, error) {
	var stats []map[string]interface{}
	err := s.db.Raw(`
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
	return stats, err
}

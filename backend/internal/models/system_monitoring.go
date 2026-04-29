package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserSession tracks active user sessions
type UserSession struct {
	ID           uuid.UUID  `gorm:"type:char(36);primaryKey" json:"id"`
	UserID       uuid.UUID  `gorm:"type:char(36);not null;index" json:"user_id"`
	SchoolID     *uuid.UUID `gorm:"type:char(36);index" json:"school_id,omitempty"`
	Token        string     `gorm:"type:varchar(500);uniqueIndex" json:"-"`
	IPAddress    string     `gorm:"type:varchar(45)" json:"ip_address"`
	UserAgent    string     `gorm:"type:text" json:"user_agent"`
	LoginAt      time.Time  `gorm:"not null;index" json:"login_at"`
	LastActivity time.Time  `gorm:"not null;index" json:"last_activity"`
	LogoutAt     *time.Time `json:"logout_at,omitempty"`
	IsActive     bool       `gorm:"default:true;index" json:"is_active"`
	User         *User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	School       *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

func (s *UserSession) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// SystemMetric stores system performance metrics
type SystemMetric struct {
	ID                uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	Timestamp         time.Time `gorm:"not null;index" json:"timestamp"`
	ActiveUsers       int       `json:"active_users"`
	ActiveSessions    int       `json:"active_sessions"`
	TotalRequests     int       `json:"total_requests"`
	AvgResponseTime   float64   `json:"avg_response_time_ms"`
	ErrorRate         float64   `json:"error_rate"`
	DatabaseQueryTime float64   `json:"database_query_time_ms"`
	MemoryUsageMB     float64   `json:"memory_usage_mb"`
	CPUUsagePercent   float64   `json:"cpu_usage_percent"`
}

func (m *SystemMetric) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}

// APIRequestLog tracks API requests for monitoring
type APIRequestLog struct {
	ID           uuid.UUID  `gorm:"type:char(36);primaryKey" json:"id"`
	UserID       *uuid.UUID `gorm:"type:char(36);index" json:"user_id,omitempty"`
	SchoolID     *uuid.UUID `gorm:"type:char(36);index" json:"school_id,omitempty"`
	Method       string     `gorm:"type:varchar(10);not null" json:"method"`
	Path         string     `gorm:"type:varchar(500);not null;index" json:"path"`
	StatusCode   int        `gorm:"not null;index" json:"status_code"`
	ResponseTime float64    `json:"response_time_ms"`
	IPAddress    string     `gorm:"type:varchar(45)" json:"ip_address"`
	UserAgent    string     `gorm:"type:text" json:"user_agent"`
	Timestamp    time.Time  `gorm:"not null;index" json:"timestamp"`
	ErrorMessage string     `gorm:"type:text" json:"error_message,omitempty"`
}

func (l *APIRequestLog) BeforeCreate(tx *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
}

// DailySystemReport stores daily aggregated system reports
type DailySystemReport struct {
	ID                  uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	Date                time.Time `gorm:"type:date;not null;uniqueIndex" json:"date"`
	TotalUsers          int       `json:"total_users"`
	ActiveUsers         int       `json:"active_users"`
	TotalSessions       int       `json:"total_sessions"`
	AvgSessionDuration  float64   `json:"avg_session_duration_minutes"`
	TotalRequests       int       `json:"total_requests"`
	SuccessfulRequests  int       `json:"successful_requests"`
	FailedRequests      int       `json:"failed_requests"`
	AvgResponseTime     float64   `json:"avg_response_time_ms"`
	SlowestEndpoint     string    `gorm:"type:varchar(500)" json:"slowest_endpoint"`
	SlowestResponseTime float64   `json:"slowest_response_time_ms"`
	PeakHour            int       `json:"peak_hour"`
	PeakHourRequests    int       `json:"peak_hour_requests"`
	ErrorRate           float64   `json:"error_rate"`
	TopErrors           JSONB     `gorm:"type:json" json:"top_errors"`
	SchoolActivity      JSONB     `gorm:"type:json" json:"school_activity"`
	CreatedAt           time.Time `json:"created_at"`
}

func (r *DailySystemReport) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

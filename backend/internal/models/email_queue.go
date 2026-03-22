package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EmailQueue struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SchoolID    *uuid.UUID     `gorm:"type:uuid;index" json:"school_id"`
	To          string         `gorm:"not null;index" json:"to"`
	Subject     string         `gorm:"not null" json:"subject"`
	Body        string         `gorm:"type:text;not null" json:"body"`
	EmailType   string         `gorm:"not null;index" json:"email_type"` // welcome, password_reset, attendance_alert, etc.
	Status      string         `gorm:"not null;default:'pending';index" json:"status"` // pending, sent, failed, cancelled
	Priority    int            `gorm:"default:5;index" json:"priority"` // 1=highest, 10=lowest
	Attempts    int            `gorm:"default:0" json:"attempts"`
	MaxAttempts int            `gorm:"default:3" json:"max_attempts"`
	LastAttempt *time.Time     `json:"last_attempt"`
	NextRetry   *time.Time     `gorm:"index" json:"next_retry"`
	SentAt      *time.Time     `json:"sent_at"`
	Error       string         `gorm:"type:text" json:"error"`
	Metadata    JSONB          `gorm:"type:jsonb" json:"metadata"` // Additional data like user_id, student_id, etc.
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (EmailQueue) TableName() string {
	return "email_queue"
}

// EmailQueueStats for monitoring
type EmailQueueStats struct {
	TotalPending  int64 `json:"total_pending"`
	TotalSent     int64 `json:"total_sent"`
	TotalFailed   int64 `json:"total_failed"`
	RecentFailures []EmailQueue `json:"recent_failures"`
}

package models

import (
	"github.com/google/uuid"
	"time"
)

// SMSProvider stores SMS provider configurations per school
type SMSProvider struct {
	BaseModel
	SchoolID     uuid.UUID `gorm:"type:char(36);not null;uniqueIndex" json:"school_id"`
	Provider     string    `gorm:"type:varchar(50);not null;default:'africastalking'" json:"provider"` // africastalking, twilio, custom
	APIKey       string    `gorm:"type:varchar(255)" json:"-"`
	APISecret    string    `gorm:"type:varchar(255)" json:"-"`
	Username     string    `gorm:"type:varchar(100)" json:"username"`
	SenderID     string    `gorm:"type:varchar(20)" json:"sender_id"`
	IsActive     bool      `gorm:"default:false" json:"is_active"`
	Balance      float64   `gorm:"type:decimal(10,2);default:0" json:"balance"`
	School       *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// SMSTemplate stores reusable SMS templates
type SMSTemplate struct {
	BaseModel
	SchoolID    *uuid.UUID `gorm:"type:char(36);index" json:"school_id,omitempty"` // null = system-wide
	Name        string     `gorm:"type:varchar(100);not null" json:"name"`
	Category    string     `gorm:"type:varchar(50);not null;index" json:"category"` // fees, attendance, results, announcement, alert
	Template    string     `gorm:"type:text;not null" json:"template"`
	Variables   JSONB      `gorm:"type:json" json:"variables"` // ["student_name", "amount", "date"]
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	School      *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// SMSQueue stores SMS to be sent
type SMSQueue struct {
	BaseModel
	SchoolID       uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	RecipientID    *uuid.UUID `gorm:"type:char(36);index" json:"recipient_id,omitempty"`
	RecipientType  string     `gorm:"type:varchar(20)" json:"recipient_type"` // guardian, student, staff
	PhoneNumber    string     `gorm:"type:varchar(20);not null" json:"phone_number"`
	Message        string     `gorm:"type:text;not null" json:"message"`
	Category       string     `gorm:"type:varchar(50);not null;index" json:"category"`
	Priority       int        `gorm:"default:5" json:"priority"` // 1=highest, 10=lowest
	Status         string     `gorm:"type:varchar(20);default:'pending';index" json:"status"` // pending, sending, sent, failed
	ScheduledFor   *time.Time `json:"scheduled_for,omitempty"`
	SentAt         *time.Time `json:"sent_at,omitempty"`
	Attempts       int        `gorm:"default:0" json:"attempts"`
	MaxAttempts    int        `gorm:"default:3" json:"max_attempts"`
	ProviderID     string     `gorm:"type:varchar(100)" json:"provider_id"`
	Cost           float64    `gorm:"type:decimal(10,2)" json:"cost"`
	ErrorMessage   string     `gorm:"type:text" json:"error_message"`
	Metadata       JSONB      `gorm:"type:json" json:"metadata"`
	CreatedBy      uuid.UUID  `gorm:"type:char(36);not null" json:"created_by"`
	School         *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// SMSBatch for bulk SMS operations
type SMSBatch struct {
	BaseModel
	SchoolID      uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	Name          string     `gorm:"type:varchar(255);not null" json:"name"`
	Category      string     `gorm:"type:varchar(50);not null" json:"category"`
	TotalCount    int        `gorm:"not null" json:"total_count"`
	SentCount     int        `gorm:"default:0" json:"sent_count"`
	FailedCount   int        `gorm:"default:0" json:"failed_count"`
	Status        string     `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending, processing, completed, failed
	TotalCost     float64    `gorm:"type:decimal(10,2);default:0" json:"total_cost"`
	StartedAt     *time.Time `json:"started_at,omitempty"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
	CreatedBy     uuid.UUID  `gorm:"type:char(36);not null" json:"created_by"`
	School        *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

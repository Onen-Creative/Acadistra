package models

import (
	"time"

	"github.com/google/uuid"
)

// SystemAnnouncement represents system-wide announcements sent to users
type SystemAnnouncement struct {
	BaseModel
	SchoolID     *uuid.UUID `gorm:"type:char(36);index" json:"school_id,omitempty"`
	Title        string     `gorm:"type:varchar(255);not null" json:"title"`
	Message      string     `gorm:"type:text;not null" json:"message"`
	TargetRoles  JSONB      `gorm:"type:json" json:"target_roles"` // ["admin", "teacher", "parent"]
	Priority     string     `gorm:"type:varchar(20);default:'normal'" json:"priority"` // low, normal, high, urgent
	SendEmail    bool       `gorm:"default:true" json:"send_email"`
	SendSMS      bool       `gorm:"default:false" json:"send_sms"`
	Status       string     `gorm:"type:varchar(20);default:'draft'" json:"status"` // draft, scheduled, sending, sent
	ScheduledFor *time.Time `json:"scheduled_for,omitempty"`
	SentAt       *time.Time `json:"sent_at,omitempty"`
	CreatedBy    uuid.UUID  `gorm:"type:char(36);not null" json:"created_by"`
	TotalSent    int        `gorm:"default:0" json:"total_sent"`
	TotalFailed  int        `gorm:"default:0" json:"total_failed"`
	School       *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Creator      *User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserNotification represents notifications for individual users
type UserNotification struct {
	ID             uuid.UUID  `gorm:"type:char(36);primaryKey" json:"id"`
	UserID         uuid.UUID  `gorm:"type:char(36);not null;index" json:"user_id"`
	AnnouncementID *uuid.UUID `gorm:"type:char(36);index" json:"announcement_id,omitempty"`
	Title          string     `gorm:"type:varchar(255);not null" json:"title"`
	Message        string     `gorm:"type:text;not null" json:"message"`
	Priority       string     `gorm:"type:varchar(20);default:'normal'" json:"priority"`
	IsRead         bool       `gorm:"default:false;index" json:"is_read"`
	CreatedAt      time.Time  `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	ReadAt         *time.Time `json:"read_at,omitempty"`
}

func (UserNotification) TableName() string {
	return "user_notifications"
}

func (n *UserNotification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}

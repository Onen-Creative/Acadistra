package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Notification struct {
	ID        uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	UserID    *uuid.UUID `json:"user_id" gorm:"type:uuid;index"`
	SchoolID  *uuid.UUID `json:"school_id" gorm:"type:uuid;index"`
	Title     string     `json:"title" gorm:"type:varchar(255);not null"`
	Message   string     `json:"message" gorm:"type:text;not null"`
	Type      string     `json:"type" gorm:"type:varchar(50);not null;index"`
	Category  string     `json:"category" gorm:"type:varchar(50);not null;index"`
	IsRead    bool       `json:"is_read" gorm:"default:false;index"`
	ActionURL *string    `json:"action_url" gorm:"type:varchar(500)"`
	CreatedAt time.Time  `json:"created_at" gorm:"autoCreateTime"`
	ReadAt    *time.Time `json:"read_at"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}

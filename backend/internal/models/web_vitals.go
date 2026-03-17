package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WebVital stores web performance metrics
type WebVital struct {
	ID        uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	SchoolID  *uuid.UUID `gorm:"type:char(36);index" json:"school_id,omitempty"`
	UserID    *uuid.UUID `gorm:"type:char(36);index" json:"user_id,omitempty"`
	Name      string    `gorm:"type:varchar(50);not null;index" json:"name"` // CLS, FID, FCP, LCP, TTFB
	Value     float64   `gorm:"not null" json:"value"`
	Rating    string    `gorm:"type:varchar(20)" json:"rating"` // good, needs-improvement, poor
	Delta     float64   `json:"delta"`
	MetricID  string    `gorm:"type:varchar(100)" json:"metric_id"`
	URL       string    `gorm:"type:varchar(500)" json:"url"`
	UserAgent string    `gorm:"type:text" json:"user_agent"`
	CreatedAt time.Time `gorm:"autoCreateTime;index" json:"created_at"`
}

func (w *WebVital) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}

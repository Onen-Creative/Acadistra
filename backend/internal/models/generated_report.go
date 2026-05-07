package models

import (
	"time"

	"github.com/google/uuid"
)

// GeneratedReport stores metadata about generated reports
type GeneratedReport struct {
	BaseModel
	SchoolID    *uuid.UUID `gorm:"type:char(36);index" json:"school_id,omitempty"`
	ReportType  string     `gorm:"type:varchar(100);not null;index" json:"report_type"`
	ReportName  string     `gorm:"type:varchar(255);not null" json:"report_name"`
	Description string     `gorm:"type:text" json:"description"`
	FilePath    string     `gorm:"type:varchar(500);not null" json:"file_path"`
	FileSize    int64      `json:"file_size"`
	Format      string     `gorm:"type:varchar(20);default:'xlsx'" json:"format"`
	Parameters  JSONB      `gorm:"type:json" json:"parameters"`
	GeneratedBy uuid.UUID  `gorm:"type:char(36);not null" json:"generated_by"`
	GeneratedAt time.Time  `gorm:"not null;index" json:"generated_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	School      *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	User        *User      `gorm:"foreignKey:GeneratedBy" json:"user,omitempty"`
}

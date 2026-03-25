package models

import (
	"time"

	"github.com/google/uuid"
)

// BulkImport tracks bulk import sessions
type BulkImport struct {
	BaseModel
	SchoolID     uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	ImportType   string    `gorm:"type:varchar(50);not null" json:"import_type"` // students, marks
	Status       string    `gorm:"type:varchar(20);not null" json:"status"`      // pending, approved, rejected
	UploadedBy   uuid.UUID `gorm:"type:char(36);not null" json:"uploaded_by"`
	ApprovedBy   *uuid.UUID `gorm:"type:char(36)" json:"approved_by,omitempty"`
	ApprovedAt   *time.Time `json:"approved_at,omitempty"`
	TotalRows    int       `gorm:"not null" json:"total_rows"`
	ValidRows    int       `gorm:"not null" json:"valid_rows"`
	InvalidRows  int       `gorm:"not null" json:"invalid_rows"`
	Errors       string    `gorm:"type:text" json:"errors"`
	Data         string    `gorm:"type:text" json:"data"` // JSON data
	Metadata     string    `gorm:"type:text" json:"metadata"` // Additional info (class_id, term, year, etc.)
	School       *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Uploader     *User     `gorm:"foreignKey:UploadedBy" json:"uploader,omitempty"`
	Approver     *User     `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
}

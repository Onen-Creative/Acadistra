package models

import (
	"time"

	"github.com/google/uuid"
)

// MarksImport tracks bulk marks import sessions with approval workflow
type MarksImport struct {
	BaseModel
	SchoolID    uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	ClassID     uuid.UUID  `gorm:"type:char(36);not null;index" json:"class_id"`
	SubjectID   uuid.UUID  `gorm:"type:char(36);not null;index" json:"subject_id"`
	Term        string     `gorm:"type:varchar(10);not null" json:"term"`
	Year        int        `gorm:"not null" json:"year"`
	ExamType    string     `gorm:"type:varchar(20);not null" json:"exam_type"`
	Status      string     `gorm:"type:varchar(20);not null;default:'pending'" json:"status"` // pending, approved, rejected
	UploadedBy  uuid.UUID  `gorm:"type:char(36);not null" json:"uploaded_by"`
	ApprovedBy  *uuid.UUID `gorm:"type:char(36)" json:"approved_by,omitempty"`
	ApprovedAt  *time.Time `json:"approved_at,omitempty"`
	RejectedBy  *uuid.UUID `gorm:"type:char(36)" json:"rejected_by,omitempty"`
	RejectedAt  *time.Time `json:"rejected_at,omitempty"`
	RejectionReason string `gorm:"type:text" json:"rejection_reason"`
	TotalRows   int        `gorm:"not null" json:"total_rows"`
	ValidRows   int        `gorm:"not null" json:"valid_rows"`
	InvalidRows int        `gorm:"not null" json:"invalid_rows"`
	Errors      string     `gorm:"type:text" json:"errors"`
	Data        string     `gorm:"type:longtext" json:"data"` // JSON array of marks
	School      *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Class       *Class     `gorm:"foreignKey:ClassID" json:"class,omitempty"`
	Subject     *StandardSubject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	Uploader    *User      `gorm:"foreignKey:UploadedBy" json:"uploader,omitempty"`
	Approver    *User      `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
}

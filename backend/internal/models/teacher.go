package models

import (
	"github.com/google/uuid"
)

// TeacherProfile extends Staff with teaching-specific information
type TeacherProfile struct {
	BaseModel
	StaffID            uuid.UUID `gorm:"type:char(36);not null;uniqueIndex" json:"staff_id"`
	SchoolID           uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	
	// Teaching Specific
	TeachingLevels     string    `gorm:"type:varchar(255)" json:"teaching_levels"` // e.g., "P1-P3,S1-S4"
	SubjectsTaught     string    `gorm:"type:text" json:"subjects_taught"` // JSON array of subject IDs
	IsClassTeacher     bool      `gorm:"default:false" json:"is_class_teacher"`
	ClassTeacherFor    *uuid.UUID `gorm:"type:char(36)" json:"class_teacher_for,omitempty"` // Class ID
	IsHeadOfDepartment bool      `gorm:"default:false" json:"is_head_of_department"`
	DepartmentHead     string    `gorm:"type:varchar(100)" json:"department_head"` // e.g., "Sciences", "Languages"
	
	// Performance
	TeachingLoad       int       `gorm:"default:0" json:"teaching_load"` // Number of periods per week
	MaxLoad            int       `gorm:"default:40" json:"max_load"`
	
	// Relations
	Staff              *Staff    `gorm:"foreignKey:StaffID" json:"staff,omitempty"`
	School             *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Class              *Class    `gorm:"foreignKey:ClassTeacherFor" json:"class,omitempty"`
}

// TeacherSubject links teachers to subjects they teach
type TeacherSubject struct {
	BaseModel
	TeacherProfileID uuid.UUID        `gorm:"type:char(36);not null;index" json:"teacher_profile_id"`
	SubjectID        uuid.UUID        `gorm:"type:char(36);not null;index" json:"subject_id"`
	SchoolID         uuid.UUID        `gorm:"type:char(36);not null;index" json:"school_id"`
	Level            string           `gorm:"type:varchar(50)" json:"level"` // Which level they teach this subject
	IsPrimary        bool             `gorm:"default:true" json:"is_primary"` // Primary subject or secondary
	TeacherProfile   *TeacherProfile  `gorm:"foreignKey:TeacherProfileID" json:"teacher_profile,omitempty"`
	Subject          *StandardSubject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	School           *School          `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

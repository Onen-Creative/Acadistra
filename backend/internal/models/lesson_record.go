package models

import (
	"time"

	"github.com/google/uuid"
)

type LessonRecord struct {
	ID              uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	SchoolID        string     `json:"school_id" gorm:"type:varchar(36);not null"`
	ClassID         string     `json:"class_id" gorm:"type:varchar(36);not null"`
	SubjectID       string     `json:"subject_id" gorm:"type:varchar(36);not null"`
	TeacherID       uuid.UUID  `json:"teacher_id" gorm:"type:uuid;not null"`
	LessonDate      time.Time  `json:"lesson_date" gorm:"type:date;not null"`
	LessonTime      string     `json:"lesson_time" gorm:"type:time;not null"`
	DurationMinutes int        `json:"duration_minutes" gorm:"default:40"`
	Topic           string     `json:"topic" gorm:"type:varchar(500);not null"`
	SubTopic        string     `json:"sub_topic" gorm:"type:varchar(500)"`
	Status          string     `json:"status" gorm:"type:varchar(20);default:'completed'"`
	ReasonMissed    string     `json:"reason_missed" gorm:"type:text"`
	Notes           string     `json:"notes" gorm:"type:text"`
	RecordedBy      uuid.UUID  `json:"recorded_by" gorm:"type:uuid;not null"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	
	// Relationships
	Class    *Class            `json:"class,omitempty" gorm:"foreignKey:ClassID"`
	Subject  *StandardSubject  `json:"subject,omitempty" gorm:"foreignKey:SubjectID"`
	Teacher  *Staff            `json:"teacher,omitempty" gorm:"foreignKey:TeacherID"`
	Recorder *User             `json:"recorder,omitempty" gorm:"foreignKey:RecordedBy"`
}

func (LessonRecord) TableName() string {
	return "lesson_records"
}

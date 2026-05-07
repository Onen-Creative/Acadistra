package models

import (
	"github.com/google/uuid"
)

// Lesson represents a scheduled lesson/class period
type Lesson struct {
	BaseModel
	SchoolID  uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	ClassID   uuid.UUID `gorm:"type:char(36);not null;index" json:"class_id"`
	SubjectID uuid.UUID `gorm:"type:char(36);not null;index" json:"subject_id"`
	TeacherID uuid.UUID `gorm:"type:char(36);not null;index" json:"teacher_id"`
	Date      string    `gorm:"type:varchar(10);not null;index" json:"date"`
	Period    int       `gorm:"not null" json:"period"`
	Term      string    `gorm:"type:varchar(10);not null" json:"term"`
	Year      string    `gorm:"type:varchar(10);not null" json:"year"`
	Status    string    `gorm:"type:varchar(20);default:'scheduled'" json:"status"`
	Notes     string    `gorm:"type:text" json:"notes"`
	Teacher   *Staff    `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
	Class     *Class    `gorm:"foreignKey:ClassID" json:"class,omitempty"`
	Subject   *StandardSubject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
}

// LessonPlan represents a teacher's lesson plan
type LessonPlan struct {
	BaseModel
	SchoolID   uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	TeacherID  uuid.UUID `gorm:"type:char(36);not null;index" json:"teacher_id"`
	SubjectID  uuid.UUID `gorm:"type:char(36);not null;index" json:"subject_id"`
	Term       string    `gorm:"type:varchar(10);not null" json:"term"`
	Year       string    `gorm:"type:varchar(10);not null" json:"year"`
	Week       int       `gorm:"not null" json:"week"`
	Topic      string    `gorm:"type:varchar(500);not null" json:"topic"`
	Objectives string    `gorm:"type:text" json:"objectives"`
	Content    string    `gorm:"type:text" json:"content"`
	Activities string    `gorm:"type:text" json:"activities"`
	Teacher    *Staff    `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
	Subject    *StandardSubject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
}

// ClassSubject represents the assignment of a teacher to teach a subject in a class
type ClassSubject struct {
	BaseModel
	SchoolID  uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	ClassID   uuid.UUID `gorm:"type:char(36);not null;index" json:"class_id"`
	SubjectID uuid.UUID `gorm:"type:char(36);not null;index" json:"subject_id"`
	TeacherID uuid.UUID `gorm:"type:char(36);not null;index" json:"teacher_id"`
	Class     *Class    `gorm:"foreignKey:ClassID" json:"class,omitempty"`
	Subject   *StandardSubject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	Teacher   *Staff    `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
}

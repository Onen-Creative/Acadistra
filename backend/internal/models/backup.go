package models

import "time"

type BackupLog struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	FileName     string    `json:"file_name" gorm:"not null"`
	FilePath     string    `json:"file_path" gorm:"not null"`
	FileSize     int64     `json:"file_size"`
	Status       string    `json:"status" gorm:"not null"` // in_progress, completed, failed
	ErrorMessage string    `json:"error_message,omitempty"`
	StartedAt    time.Time `json:"started_at" gorm:"not null"`
	CompletedAt  time.Time `json:"completed_at"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

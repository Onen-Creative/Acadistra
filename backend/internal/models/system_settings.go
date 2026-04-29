package models

import "time"

// SystemSetting stores system-wide configuration
type SystemSetting struct {
	Key       string    `gorm:"primaryKey;type:varchar(255)" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (SystemSetting) TableName() string {
	return "system_settings"
}

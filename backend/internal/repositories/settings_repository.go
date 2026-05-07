package repositories

import (
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type SettingsRepository struct {
	db *gorm.DB
}

func NewSettingsRepository(db *gorm.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) GetAllSettings() (map[string]string, error) {
	var settings []models.SystemSetting
	if err := r.db.Find(&settings).Error; err != nil {
		return nil, err
	}

	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}
	return settingsMap, nil
}

func (r *SettingsRepository) UpdateSettings(updates map[string]string) error {
	for key, value := range updates {
		var setting models.SystemSetting
		err := r.db.Where("key = ?", key).First(&setting).Error
		if err == gorm.ErrRecordNotFound {
			setting = models.SystemSetting{Key: key, Value: value}
			if err := r.db.Create(&setting).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else {
			setting.Value = value
			if err := r.db.Save(&setting).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *SettingsRepository) GetSchoolSettings(schoolID string) (map[string]interface{}, error) {
	r.db.Exec(`CREATE TABLE IF NOT EXISTS school_settings (
		school_id UUID NOT NULL,
		section VARCHAR(50) NOT NULL,
		data JSONB,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (school_id, section)
	)`)

	var settings []struct {
		Section string                 `json:"section"`
		Data    map[string]interface{} `json:"data" gorm:"type:jsonb"`
	}
	r.db.Table("school_settings").Where("school_id = ?", schoolID).Find(&settings)

	result := make(map[string]interface{})
	for _, s := range settings {
		result[s.Section] = s.Data
	}
	return result, nil
}

func (r *SettingsRepository) UpdateSchoolSettings(schoolID, section string, data map[string]interface{}) error {
	r.db.Exec(`CREATE TABLE IF NOT EXISTS school_settings (
		school_id UUID NOT NULL,
		section VARCHAR(50) NOT NULL,
		data JSONB,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (school_id, section)
	)`)

	var count int64
	r.db.Table("school_settings").Where("school_id = ? AND section = ?", schoolID, section).Count(&count)
	if count > 0 {
		return r.db.Exec("UPDATE school_settings SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE school_id = ? AND section = ?",
			data, schoolID, section).Error
	}
	return r.db.Exec("INSERT INTO school_settings (school_id, section, data) VALUES (?, ?, ?)",
		schoolID, section, data).Error
}

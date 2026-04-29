package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type SettingsHandler struct {
	db *gorm.DB
}

func NewSettingsHandler(db *gorm.DB) *SettingsHandler {
	return &SettingsHandler{db: db}
}

type SystemSettings struct {
	SystemName       string `json:"system_name"`
	SupportEmail     string `json:"support_email"`
	DefaultCountry   string `json:"default_country"`
	TwoFactorEnabled bool   `json:"two_factor_enabled"`
	SessionTimeout   int    `json:"session_timeout"`
	SMTPHost         string `json:"smtp_host"`
	SMTPPort         int    `json:"smtp_port"`
	SMTPUsername     string `json:"smtp_username"`
	AutoBackup       bool   `json:"auto_backup"`
	BackupTime       string `json:"backup_time"`
}

func (h *SettingsHandler) GetSettings(c *gin.Context) {
	var settings []models.SystemSetting
	if err := h.db.Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}

	sessionTimeout := 30
	if val := getOrDefault(settingsMap, "session_timeout", "30"); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil {
			sessionTimeout = parsed
		}
	}

	smtpPort := 587
	if val := getOrDefault(settingsMap, "smtp_port", "587"); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil {
			smtpPort = parsed
		}
	}

	result := SystemSettings{
		SystemName:       getOrDefault(settingsMap, "system_name", "Acadistra"),
		SupportEmail:     getOrDefault(settingsMap, "support_email", "support@acadistra.com"),
		DefaultCountry:   getOrDefault(settingsMap, "default_country", "Uganda"),
		TwoFactorEnabled: getOrDefault(settingsMap, "two_factor_enabled", "false") == "true",
		SessionTimeout:   sessionTimeout,
		SMTPHost:         getOrDefault(settingsMap, "smtp_host", "smtp.gmail.com"),
		SMTPPort:         smtpPort,
		SMTPUsername:     getOrDefault(settingsMap, "smtp_username", ""),
		AutoBackup:       getOrDefault(settingsMap, "auto_backup", "true") == "true",
		BackupTime:       getOrDefault(settingsMap, "backup_time", "02:00"),
	}

	c.JSON(http.StatusOK, result)
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var input SystemSettings
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]string{
		"system_name":        input.SystemName,
		"support_email":      input.SupportEmail,
		"default_country":    input.DefaultCountry,
		"two_factor_enabled": boolToString(input.TwoFactorEnabled),
		"session_timeout":    strconv.Itoa(input.SessionTimeout),
		"smtp_host":          input.SMTPHost,
		"smtp_port":          strconv.Itoa(input.SMTPPort),
		"smtp_username":      input.SMTPUsername,
		"auto_backup":        boolToString(input.AutoBackup),
		"backup_time":        input.BackupTime,
	}

	for key, value := range updates {
		var setting models.SystemSetting
		err := h.db.Where("key = ?", key).First(&setting).Error
		if err == gorm.ErrRecordNotFound {
			setting = models.SystemSetting{Key: key, Value: value}
			if err := h.db.Create(&setting).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create setting"})
				return
			}
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		} else {
			setting.Value = value
			if err := h.db.Save(&setting).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting"})
				return
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated successfully"})
}

func (h *SettingsHandler) UpdateSchoolSettings(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	var input struct {
		Section string                 `json:"section"`
		Data    map[string]interface{} `json:"data"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.db.Exec(`CREATE TABLE IF NOT EXISTS school_settings (
		school_id UUID NOT NULL,
		section VARCHAR(50) NOT NULL,
		data JSONB,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (school_id, section)
	)`)

	var count int64
	h.db.Table("school_settings").Where("school_id = ? AND section = ?", schoolID, input.Section).Count(&count)
	if count > 0 {
		h.db.Exec("UPDATE school_settings SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE school_id = ? AND section = ?",
			input.Data, schoolID, input.Section)
	} else {
		h.db.Exec("INSERT INTO school_settings (school_id, section, data) VALUES (?, ?, ?)",
			schoolID, input.Section, input.Data)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings saved successfully"})
}

func (h *SettingsHandler) GetSchoolSettings(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	var settings []struct {
		Section string                 `json:"section"`
		Data    map[string]interface{} `json:"data" gorm:"type:jsonb"`
	}
	h.db.Table("school_settings").Where("school_id = ?", schoolID).Find(&settings)

	result := make(map[string]interface{})
	for _, s := range settings {
		result[s.Section] = s.Data
	}

	c.JSON(http.StatusOK, result)
}

func getOrDefault(m map[string]string, key, defaultValue string) string {
	if val, ok := m[key]; ok && val != "" {
		return val
	}
	return defaultValue
}

func boolToString(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

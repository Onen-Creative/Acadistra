package services

import (
	"strconv"

	"github.com/school-system/backend/internal/repositories"
)

type SettingsService struct {
	repo *repositories.SettingsRepository
}

func NewSettingsService(repo *repositories.SettingsRepository) *SettingsService {
	return &SettingsService{repo: repo}
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

func (s *SettingsService) GetSettings() (*SystemSettings, error) {
	settingsMap, err := s.repo.GetAllSettings()
	if err != nil {
		return nil, err
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

	return &SystemSettings{
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
	}, nil
}

func (s *SettingsService) UpdateSettings(settings *SystemSettings) error {
	updates := map[string]string{
		"system_name":        settings.SystemName,
		"support_email":      settings.SupportEmail,
		"default_country":    settings.DefaultCountry,
		"two_factor_enabled": boolToString(settings.TwoFactorEnabled),
		"session_timeout":    strconv.Itoa(settings.SessionTimeout),
		"smtp_host":          settings.SMTPHost,
		"smtp_port":          strconv.Itoa(settings.SMTPPort),
		"smtp_username":      settings.SMTPUsername,
		"auto_backup":        boolToString(settings.AutoBackup),
		"backup_time":        settings.BackupTime,
	}

	return s.repo.UpdateSettings(updates)
}

func (s *SettingsService) GetSchoolSettings(schoolID string) (map[string]interface{}, error) {
	return s.repo.GetSchoolSettings(schoolID)
}

func (s *SettingsService) UpdateSchoolSettings(schoolID, section string, data map[string]interface{}) error {
	return s.repo.UpdateSchoolSettings(schoolID, section, data)
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

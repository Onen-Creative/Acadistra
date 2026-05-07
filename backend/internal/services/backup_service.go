package services

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type BackupService struct {
	repo *repositories.BackupRepository
	db   *gorm.DB
}

func NewBackupService(db *gorm.DB) *BackupService {
	return &BackupService{
		repo: repositories.NewBackupRepository(db),
		db:   db,
	}
}

func (s *BackupService) RunBackup() (*models.BackupLog, error) {
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	if dbHost == "" {
		dbHost = "localhost"
	}
	if dbPort == "" {
		dbPort = "5432"
	}

	if dbUser == "" || dbPassword == "" || dbName == "" {
		return nil, fmt.Errorf("database configuration missing")
	}

	timestamp := time.Now().Format("20060102_150405")
	backupDir := "./backups"
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create backup directory: %w", err)
	}

	backupFile := fmt.Sprintf("%s/backup_%s.sql", backupDir, timestamp)

	// Create backup log entry
	backupLog := &models.BackupLog{
		FileName:  filepath.Base(backupFile),
		FilePath:  backupFile,
		Status:    "in_progress",
		StartedAt: time.Now(),
	}

	if err := s.repo.Create(backupLog); err != nil {
		return nil, fmt.Errorf("failed to create backup log: %w", err)
	}

	// Run pg_dump
	cmd := exec.Command("pg_dump",
		"-h", dbHost,
		"-p", dbPort,
		"-U", dbUser,
		"-d", dbName,
		"-F", "c",
		"-f", backupFile,
	)
	cmd.Env = append(os.Environ(), fmt.Sprintf("PGPASSWORD=%s", dbPassword))

	if err := cmd.Run(); err != nil {
		backupLog.Status = "failed"
		backupLog.ErrorMessage = err.Error()
		backupLog.CompletedAt = time.Now()
		s.repo.Update(backupLog)
		return nil, fmt.Errorf("backup failed: %w", err)
	}

	// Get file size
	fileInfo, err := os.Stat(backupFile)
	if err != nil {
		backupLog.Status = "failed"
		backupLog.ErrorMessage = fmt.Sprintf("failed to get file info: %v", err)
		backupLog.CompletedAt = time.Now()
		s.repo.Update(backupLog)
		return nil, fmt.Errorf("failed to get backup file info: %w", err)
	}

	// Update backup log
	backupLog.Status = "completed"
	backupLog.FileSize = fileInfo.Size()
	backupLog.CompletedAt = time.Now()

	if err := s.repo.Update(backupLog); err != nil {
		return nil, fmt.Errorf("failed to update backup log: %w", err)
	}

	return backupLog, nil
}

func (s *BackupService) ListBackups(limit int) ([]models.BackupLog, error) {
	return s.repo.List(limit)
}

func (s *BackupService) GetBackup(id uint) (*models.BackupLog, error) {
	return s.repo.GetByID(id)
}

func (s *BackupService) CleanupOldBackups(days int) error {
	// Delete old backup files
	backups, err := s.repo.List(0)
	if err != nil {
		return fmt.Errorf("failed to list backups: %w", err)
	}

	cutoffDate := time.Now().AddDate(0, 0, -days)
	for _, backup := range backups {
		if backup.CreatedAt.Before(cutoffDate) {
			if err := os.Remove(backup.FilePath); err != nil && !os.IsNotExist(err) {
				// Log error but continue
				fmt.Printf("Failed to delete backup file %s: %v\n", backup.FilePath, err)
			}
		}
	}

	// Delete old backup log entries
	return s.repo.DeleteOlderThan(days)
}

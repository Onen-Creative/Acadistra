package repositories

import (
	"time"

	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type BackupRepository struct {
	db *gorm.DB
}

func NewBackupRepository(db *gorm.DB) *BackupRepository {
	return &BackupRepository{db: db}
}

func (r *BackupRepository) Create(backup *models.BackupLog) error {
	return r.db.Create(backup).Error
}

func (r *BackupRepository) Update(backup *models.BackupLog) error {
	return r.db.Save(backup).Error
}

func (r *BackupRepository) GetByID(id uint) (*models.BackupLog, error) {
	var backup models.BackupLog
	if err := r.db.First(&backup, id).Error; err != nil {
		return nil, err
	}
	return &backup, nil
}

func (r *BackupRepository) List(limit int) ([]models.BackupLog, error) {
	var backups []models.BackupLog
	query := r.db.Order("created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&backups).Error; err != nil {
		return nil, err
	}
	return backups, nil
}

func (r *BackupRepository) DeleteOlderThan(days int) error {
	cutoffDate := time.Now().AddDate(0, 0, -days)
	return r.db.Where("created_at < ?", cutoffDate).Delete(&models.BackupLog{}).Error
}

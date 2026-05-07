package repositories

import (
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type GeneratedReportRepository struct {
	db *gorm.DB
}

func NewGeneratedReportRepository(db *gorm.DB) *GeneratedReportRepository {
	return &GeneratedReportRepository{db: db}
}

func (r *GeneratedReportRepository) Create(report *models.GeneratedReport) error {
	return r.db.Create(report).Error
}

func (r *GeneratedReportRepository) GetByID(id uuid.UUID) (*models.GeneratedReport, error) {
	var report models.GeneratedReport
	err := r.db.Preload("User").Preload("School").First(&report, "id = ?", id).Error
	return &report, err
}

func (r *GeneratedReportRepository) List(schoolID *uuid.UUID, limit int) ([]models.GeneratedReport, error) {
	var reports []models.GeneratedReport
	query := r.db.Preload("User").Preload("School").Order("generated_at DESC")
	
	if schoolID != nil {
		query = query.Where("school_id = ? OR school_id IS NULL", schoolID)
	}
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	err := query.Find(&reports).Error
	return reports, err
}

func (r *GeneratedReportRepository) DeleteExpired() error {
	return r.db.Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).Delete(&models.GeneratedReport{}).Error
}

func (r *GeneratedReportRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.GeneratedReport{}, "id = ?", id).Error
}

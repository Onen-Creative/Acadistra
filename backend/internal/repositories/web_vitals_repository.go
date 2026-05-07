package repositories

import (
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type WebVitalsRepository struct {
	db *gorm.DB
}

type WebVitalStats struct {
	Name    string  `json:"name"`
	Average float64 `json:"average"`
	P50     float64 `json:"p50"`
	P75     float64 `json:"p75"`
	P95     float64 `json:"p95"`
	Count   int64   `json:"count"`
}

func NewWebVitalsRepository(db *gorm.DB) *WebVitalsRepository {
	return &WebVitalsRepository{db: db}
}

func (r *WebVitalsRepository) Create(vital *models.WebVital) error {
	return r.db.Create(vital).Error
}

func (r *WebVitalsRepository) GetStats(schoolID, metricName string) ([]WebVitalStats, error) {
	query := r.db.Model(&models.WebVital{})

	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}

	if metricName != "" {
		query = query.Where("name = ?", metricName)
	}

	var stats []WebVitalStats
	err := query.Select(`
		name,
		AVG(value) as average,
		PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as p50,
		PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75,
		PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
		COUNT(*) as count
	`).Group("name").Scan(&stats).Error

	return stats, err
}

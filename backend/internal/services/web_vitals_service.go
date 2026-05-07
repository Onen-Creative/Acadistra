package services

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
)

type WebVitalsService struct {
	repo *repositories.WebVitalsRepository
}

func NewWebVitalsService(repo *repositories.WebVitalsRepository) *WebVitalsService {
	return &WebVitalsService{repo: repo}
}

type WebVitalRequest struct {
	Name      string
	Value     float64
	Rating    string
	Delta     float64
	ID        string
	URL       string
	UserAgent string
	UserID    *uuid.UUID
	SchoolID  *uuid.UUID
}

func (s *WebVitalsService) RecordWebVital(req *WebVitalRequest) error {
	vital := &models.WebVital{
		Name:      req.Name,
		Value:     req.Value,
		Rating:    req.Rating,
		Delta:     req.Delta,
		MetricID:  req.ID,
		URL:       req.URL,
		UserAgent: req.UserAgent,
		UserID:    req.UserID,
		SchoolID:  req.SchoolID,
	}
	return s.repo.Create(vital)
}

func (s *WebVitalsService) GetStats(schoolID, metricName string) ([]repositories.WebVitalStats, error) {
	return s.repo.GetStats(schoolID, metricName)
}

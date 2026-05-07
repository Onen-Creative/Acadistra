package services

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
)

type AuditService struct {
	repo *repositories.AuditRepository
}

func NewAuditService(repo *repositories.AuditRepository) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) GetRecentActivity(limit int, actionFilter string) ([]repositories.ActivityWithUser, error) {
	return s.repo.GetRecentActivity(limit, actionFilter)
}

func (s *AuditService) Log(userID uuid.UUID, action, resourceType string, resourceID uuid.UUID, before, after models.JSONB, ip string) {
	s.repo.CreateAuditLog(userID, action, resourceType, resourceID, before, after, ip)
}

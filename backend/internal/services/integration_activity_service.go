package services

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
)

type IntegrationActivityService struct {
	repo *repositories.IntegrationActivityRepository
}

func NewIntegrationActivityService(repo *repositories.IntegrationActivityRepository) *IntegrationActivityService {
	return &IntegrationActivityService{repo: repo}
}

func (s *IntegrationActivityService) GetByClass(schoolID, classID, subjectID, term, year string) ([]models.IntegrationActivity, error) {
	return s.repo.FindByClass(schoolID, classID, subjectID, term, year)
}

func (s *IntegrationActivityService) CreateOrUpdate(schoolID, studentID, subjectID, classID, term string, year int, marks models.JSONB) (*models.IntegrationActivity, error) {
	// Validate marks are between 0 and 3
	for _, v := range marks {
		if mark, ok := v.(float64); ok {
			if mark < 0 || mark > 3 {
				return nil, fmt.Errorf("marks must be between 0 and 3")
			}
		}
	}

	studentUUID, _ := uuid.Parse(studentID)
	subjectUUID, _ := uuid.Parse(subjectID)
	classUUID, _ := uuid.Parse(classID)
	schoolUUID, _ := uuid.Parse(schoolID)

	return s.repo.CreateOrUpdate(schoolUUID, studentUUID, subjectUUID, classUUID, term, year, marks)
}

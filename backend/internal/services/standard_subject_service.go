package services

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type StandardSubjectService struct {
	db *gorm.DB
}

func NewStandardSubjectService(db *gorm.DB) *StandardSubjectService {
	return &StandardSubjectService{db: db}
}

// GetSubjectsForLevel returns standard subjects for a specific education level
func (s *StandardSubjectService) GetSubjectsForLevel(level string) ([]models.StandardSubject, error) {
	var subjects []models.StandardSubject
	err := s.db.Where("level = ?", level).Find(&subjects).Error
	return subjects, err
}

// CreateSchoolSubjectsFromStandard is deprecated - system uses standard_subjects directly
func (s *StandardSubjectService) CreateSchoolSubjectsFromStandard(schoolID uuid.UUID, levels []string) error {
	return nil
}

// GetAllLevels returns all available education levels
func (s *StandardSubjectService) GetAllLevels() ([]string, error) {
	var levels []string
	err := s.db.Model(&models.StandardSubject{}).Distinct("level").Pluck("level", &levels).Error
	return levels, err
}
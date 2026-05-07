package services

import (
	"errors"

	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type SubjectService struct {
	repo repositories.SubjectRepository
	db   *gorm.DB
}

func NewSubjectService(repo repositories.SubjectRepository, db *gorm.DB) *SubjectService {
	return &SubjectService{repo: repo, db: db}
}

func (s *SubjectService) FindStandardSubjectsByLevel(level string) ([]models.StandardSubject, error) {
	return s.repo.FindStandardSubjectsByLevel(level)
}

func (s *SubjectService) FindStandardSubjectByID(id uint) (*models.StandardSubject, error) {
	return s.repo.FindStandardSubjectByID(id)
}

func (s *SubjectService) CreateStandardSubject(subject *models.StandardSubject) error {
	return s.repo.CreateStandardSubject(subject)
}

func (s *SubjectService) FindSubjectsByClass(classID uint) ([]models.SubjectResult, error) {
	return s.repo.FindSubjectsByClass(classID)
}

func (s *SubjectService) CreateSubject(subject *models.SubjectResult) error {
	return s.repo.CreateSubject(subject)
}

func (s *SubjectService) UpdateSubject(subject *models.SubjectResult) error {
	return s.repo.UpdateSubject(subject)
}

func (s *SubjectService) DeleteSubject(id uint) error {
	return s.repo.DeleteSubject(id)
}

func (s *SubjectService) ListAll() ([]models.StandardSubject, error) {
	var subjects []models.StandardSubject
	err := s.db.Find(&subjects).Error
	return subjects, err
}

func (s *SubjectService) ListByLevel(level string) ([]models.StandardSubject, error) {
	var subjects []models.StandardSubject
	err := s.db.Where("level = ?", level).Find(&subjects).Error
	return subjects, err
}

func (s *SubjectService) GetByID(id string) (*models.StandardSubject, error) {
	var subject models.StandardSubject
	if err := s.db.First(&subject, "id = ?", id).Error; err != nil {
		return nil, errors.New("standard subject not found")
	}
	return &subject, nil
}

func (s *SubjectService) Create(subject *models.StandardSubject) error {
	var existing models.StandardSubject
	err := s.db.Where("name = ? AND level = ?", subject.Name, subject.Level).First(&existing).Error
	if err == nil {
		return errors.New("standard subject already exists for this level")
	}
	return s.db.Create(subject).Error
}

func (s *SubjectService) Update(id string, subject *models.StandardSubject) error {
	var existing models.StandardSubject
	if err := s.db.First(&existing, "id = ?", id).Error; err != nil {
		return errors.New("standard subject not found")
	}
	return s.db.Model(&existing).Updates(subject).Error
}

func (s *SubjectService) Delete(id string) error {
	return s.db.Delete(&models.StandardSubject{}, "id = ?", id).Error
}

func (s *SubjectService) GetSchoolSubjects(schoolID string) ([]models.StandardSubject, error) {
	var school models.School
	if err := s.db.First(&school, "id = ?", schoolID).Error; err != nil {
		return nil, errors.New("school not found")
	}
	var levels []string
	if school.Config != nil {
		if configLevels, ok := school.Config["levels"].([]interface{}); ok {
			for _, lvl := range configLevels {
				if level, ok := lvl.(string); ok {
					levels = append(levels, level)
				}
			}
		}
	}
	if len(levels) == 0 {
		return []models.StandardSubject{}, nil
	}
	var subjects []models.StandardSubject
	if err := s.db.Where("level IN ?", levels).Find(&subjects).Error; err != nil {
		return nil, err
	}
	subjectMap := make(map[string]models.StandardSubject)
	for _, subject := range subjects {
		if _, exists := subjectMap[subject.Name]; !exists {
			subjectMap[subject.Name] = subject
		}
	}
	var uniqueSubjects []models.StandardSubject
	for _, subject := range subjectMap {
		uniqueSubjects = append(uniqueSubjects, subject)
	}
	return uniqueSubjects, nil
}

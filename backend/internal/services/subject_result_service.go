package services

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
)

type SubjectResultService struct {
	repo repositories.SubjectResultRepository
}

func NewSubjectResultService(repo repositories.SubjectResultRepository) *SubjectResultService {
	return &SubjectResultService{repo: repo}
}

func (s *SubjectResultService) Create(result *models.SubjectResult) error {
	return s.repo.Create(result)
}

func (s *SubjectResultService) Update(result interface{}) error {
	return s.repo.Update(result)
}

func (s *SubjectResultService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *SubjectResultService) FindByID(id uuid.UUID) (*models.SubjectResult, error) {
	var result models.SubjectResult
	err := s.repo.FindByID(id, &result)
	return &result, err
}

func (s *SubjectResultService) FindByStudent(studentID uuid.UUID, term string, year int, examType string) ([]models.SubjectResult, error) {
	return s.repo.FindByStudent(studentID, term, year, examType)
}

func (s *SubjectResultService) FindByClass(classID uuid.UUID, term string, year int, examType string) ([]models.SubjectResult, error) {
	return s.repo.FindByClass(classID, term, year, examType)
}

func (s *SubjectResultService) FindBySubject(subjectID uuid.UUID, classID uuid.UUID, term string, year int) ([]models.SubjectResult, error) {
	return s.repo.FindBySubject(subjectID, classID, term, year)
}

func (s *SubjectResultService) BulkCreate(results []models.SubjectResult) error {
	return s.repo.BulkCreate(results)
}

func (s *SubjectResultService) UpdateGrade(resultID uuid.UUID, grade, reason, hash string) error {
	return s.repo.UpdateGrade(resultID, grade, reason, hash)
}

func (s *SubjectResultService) FindExisting(studentID, subjectID uuid.UUID, term string, year int, examType string, paper int) (*models.SubjectResult, error) {
	return s.repo.FindExisting(studentID, subjectID, term, year, examType, paper)
}

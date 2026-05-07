package services

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
)

type EnrollmentService struct {
	repo repositories.EnrollmentRepository
}

func NewEnrollmentService(repo repositories.EnrollmentRepository) *EnrollmentService {
	return &EnrollmentService{repo: repo}
}

func (s *EnrollmentService) Create(enrollment *models.Enrollment) error {
	return s.repo.Create(enrollment)
}

func (s *EnrollmentService) Update(enrollment interface{}) error {
	return s.repo.Update(enrollment)
}

func (s *EnrollmentService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *EnrollmentService) FindByID(id uuid.UUID) (*models.Enrollment, error) {
	var enrollment models.Enrollment
	err := s.repo.FindByID(id, &enrollment)
	return &enrollment, err
}

func (s *EnrollmentService) FindByStudent(studentID uuid.UUID) ([]models.Enrollment, error) {
	return s.repo.FindByStudent(studentID)
}

func (s *EnrollmentService) FindByClass(classID uuid.UUID, status string) ([]models.Enrollment, error) {
	return s.repo.FindByClass(classID, status)
}

func (s *EnrollmentService) FindActiveEnrollment(studentID uuid.UUID) (*models.Enrollment, error) {
	return s.repo.FindActiveEnrollment(studentID)
}

func (s *EnrollmentService) UpdateStatus(id uuid.UUID, status string) error {
	return s.repo.UpdateStatus(id, status)
}

func (s *EnrollmentService) CountByClass(classID uuid.UUID, status string) (int64, error) {
	return s.repo.CountByClass(classID, status)
}

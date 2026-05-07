package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// EnrollmentRepository defines enrollment-specific database operations
type EnrollmentRepository interface {
	BaseRepository
	FindByStudent(studentID uuid.UUID) ([]models.Enrollment, error)
	FindByClass(classID uuid.UUID, status string) ([]models.Enrollment, error)
	FindActiveEnrollment(studentID uuid.UUID) (*models.Enrollment, error)
	FindExisting(studentID, classID uuid.UUID, year int, term string) (*models.Enrollment, error)
	UpdateStatus(enrollmentID uuid.UUID, status string) error
	CountByClass(classID uuid.UUID, status string) (int64, error)
}

type enrollmentRepository struct {
	*baseRepository
}

// NewEnrollmentRepository creates a new enrollment repository
func NewEnrollmentRepository(db *gorm.DB) EnrollmentRepository {
	return &enrollmentRepository{
		baseRepository: &baseRepository{db: db},
	}
}

func (r *enrollmentRepository) FindByStudent(studentID uuid.UUID) ([]models.Enrollment, error) {
	var enrollments []models.Enrollment
	err := r.db.Where("student_id = ?", studentID).
		Preload("Class").
		Order("year DESC, term DESC").
		Find(&enrollments).Error
	return enrollments, err
}

func (r *enrollmentRepository) FindByClass(classID uuid.UUID, status string) ([]models.Enrollment, error) {
	var enrollments []models.Enrollment
	query := r.db.Where("class_id = ?", classID)
	if status != "" {
		query = query.Where("status = ?", status)
	}
	err := query.Preload("Student").
		Order("enrolled_on DESC").
		Find(&enrollments).Error
	return enrollments, err
}

func (r *enrollmentRepository) FindActiveEnrollment(studentID uuid.UUID) (*models.Enrollment, error) {
	var enrollment models.Enrollment
	err := r.db.Where("student_id = ? AND status = ?", studentID, "active").
		Preload("Class").
		Order("created_at DESC").
		First(&enrollment).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &enrollment, nil
}

func (r *enrollmentRepository) FindExisting(studentID, classID uuid.UUID, year int, term string) (*models.Enrollment, error) {
	var enrollment models.Enrollment
	err := r.db.Where("student_id = ? AND class_id = ? AND year = ? AND term = ?",
		studentID, classID, year, term).First(&enrollment).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &enrollment, nil
}

func (r *enrollmentRepository) UpdateStatus(enrollmentID uuid.UUID, status string) error {
	return r.db.Model(&models.Enrollment{}).
		Where("id = ?", enrollmentID).
		Update("status", status).Error
}

func (r *enrollmentRepository) CountByClass(classID uuid.UUID, status string) (int64, error) {
	var count int64
	query := r.db.Model(&models.Enrollment{}).Where("class_id = ?", classID)
	if status != "" {
		query = query.Where("status = ?", status)
	}
	err := query.Count(&count).Error
	return count, err
}

package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// GuardianRepository defines guardian-specific database operations
type GuardianRepository interface {
	BaseRepository
	FindByStudentID(studentID uuid.UUID) ([]models.Guardian, error)
	FindByEmail(email string) (*models.Guardian, error)
	FindByPhone(phone string) ([]models.Guardian, error)
	DeleteByStudentID(studentID uuid.UUID) error
}

type guardianRepository struct {
	*baseRepository
}

// NewGuardianRepository creates a new guardian repository
func NewGuardianRepository(db *gorm.DB) GuardianRepository {
	return &guardianRepository{
		baseRepository: &baseRepository{db: db},
	}
}

func (r *guardianRepository) FindByStudentID(studentID uuid.UUID) ([]models.Guardian, error) {
	var guardians []models.Guardian
	err := r.db.Where("student_id = ?", studentID).Find(&guardians).Error
	return guardians, err
}

func (r *guardianRepository) FindByEmail(email string) (*models.Guardian, error) {
	var guardian models.Guardian
	err := r.db.Where("email = ?", email).First(&guardian).Error
	if err != nil {
		return nil, err
	}
	return &guardian, nil
}

func (r *guardianRepository) FindByPhone(phone string) ([]models.Guardian, error) {
	var guardians []models.Guardian
	err := r.db.Where("phone = ?", phone).Find(&guardians).Error
	return guardians, err
}

func (r *guardianRepository) DeleteByStudentID(studentID uuid.UUID) error {
	return r.db.Where("student_id = ?", studentID).Delete(&models.Guardian{}).Error
}

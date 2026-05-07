package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// StaffRepository defines staff-specific database operations
type StaffRepository interface {
	BaseRepository
	FindBySchoolID(schoolID uuid.UUID) ([]models.Staff, error)
	FindByRole(schoolID uuid.UUID, role string) ([]models.Staff, error)
	FindByEmail(email string) (*models.Staff, error)
	FindByStaffNo(staffNo string, schoolID uuid.UUID) (*models.Staff, error)
	Search(schoolID uuid.UUID, query string, page, limit int) ([]models.Staff, int64, error)
	CountBySchoolID(schoolID uuid.UUID) (int64, error)
	CountByRole(schoolID uuid.UUID, role string) (int64, error)
}

type staffRepository struct {
	*baseRepository
}

// NewStaffRepository creates a new staff repository
func NewStaffRepository(db *gorm.DB) StaffRepository {
	return &staffRepository{
		baseRepository: &baseRepository{db: db},
	}
}

func (r *staffRepository) FindBySchoolID(schoolID uuid.UUID) ([]models.Staff, error) {
	var staff []models.Staff
	err := r.db.Where("school_id = ?", schoolID).
		Order("first_name ASC, last_name ASC").
		Find(&staff).Error
	return staff, err
}

func (r *staffRepository) FindByRole(schoolID uuid.UUID, role string) ([]models.Staff, error) {
	var staff []models.Staff
	err := r.db.Where("school_id = ? AND role = ?", schoolID, role).
		Order("first_name ASC, last_name ASC").
		Find(&staff).Error
	return staff, err
}

func (r *staffRepository) FindByEmail(email string) (*models.Staff, error) {
	var staff models.Staff
	err := r.db.Where("email = ?", email).First(&staff).Error
	if err != nil {
		return nil, err
	}
	return &staff, nil
}

func (r *staffRepository) FindByStaffNo(staffNo string, schoolID uuid.UUID) (*models.Staff, error) {
	var staff models.Staff
	err := r.db.Where("staff_no = ? AND school_id = ?", staffNo, schoolID).First(&staff).Error
	if err != nil {
		return nil, err
	}
	return &staff, nil
}

func (r *staffRepository) Search(schoolID uuid.UUID, query string, page, limit int) ([]models.Staff, int64, error) {
	var staff []models.Staff
	var total int64

	searchQuery := r.db.Where("school_id = ?", schoolID).
		Where("first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ? OR staff_no ILIKE ?",
			"%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%")

	if err := searchQuery.Model(&models.Staff{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := searchQuery.Offset(offset).Limit(limit).Find(&staff).Error; err != nil {
		return nil, 0, err
	}

	return staff, total, nil
}

func (r *staffRepository) CountBySchoolID(schoolID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.Staff{}).Where("school_id = ?", schoolID).Count(&count).Error
	return count, err
}

func (r *staffRepository) CountByRole(schoolID uuid.UUID, role string) (int64, error) {
	var count int64
	err := r.db.Model(&models.Staff{}).
		Where("school_id = ? AND role = ?", schoolID, role).
		Count(&count).Error
	return count, err
}

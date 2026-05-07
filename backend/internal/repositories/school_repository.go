package repositories

import (
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type SchoolRepository interface {
	Create(school *models.School) error
	Update(school *models.School) error
	Delete(id uint) error
	FindByID(id uint) (*models.School, error)
	FindBySubdomain(subdomain string) (*models.School, error)
	FindAll() ([]models.School, error)
	Count() (int64, error)
}

type schoolRepository struct {
	db *gorm.DB
}

func NewSchoolRepository(db *gorm.DB) SchoolRepository {
	return &schoolRepository{db: db}
}

func (r *schoolRepository) Create(school *models.School) error {
	return r.db.Create(school).Error
}

func (r *schoolRepository) Update(school *models.School) error {
	return r.db.Save(school).Error
}

func (r *schoolRepository) Delete(id uint) error {
	return r.db.Delete(&models.School{}, id).Error
}

func (r *schoolRepository) FindByID(id uint) (*models.School, error) {
	var school models.School
	err := r.db.First(&school, id).Error
	return &school, err
}

func (r *schoolRepository) FindBySubdomain(subdomain string) (*models.School, error) {
	var school models.School
	err := r.db.Where("subdomain = ?", subdomain).First(&school).Error
	return &school, err
}

func (r *schoolRepository) FindAll() ([]models.School, error) {
	var schools []models.School
	err := r.db.Find(&schools).Error
	return schools, err
}

func (r *schoolRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.School{}).Count(&count).Error
	return count, err
}

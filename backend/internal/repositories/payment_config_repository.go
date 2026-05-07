package repositories

import (
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type PaymentConfigRepository struct {
	db *gorm.DB
}

func NewPaymentConfigRepository(db *gorm.DB) *PaymentConfigRepository {
	return &PaymentConfigRepository{db: db}
}

func (r *PaymentConfigRepository) FindBySchoolID(schoolID string) (*models.SchoolPaymentConfig, error) {
	var config models.SchoolPaymentConfig
	err := r.db.Where("school_id = ?", schoolID).First(&config).Error
	return &config, err
}

func (r *PaymentConfigRepository) Create(config *models.SchoolPaymentConfig) (*models.SchoolPaymentConfig, error) {
	err := r.db.Create(config).Error
	return config, err
}

func (r *PaymentConfigRepository) Update(config *models.SchoolPaymentConfig) (*models.SchoolPaymentConfig, error) {
	err := r.db.Save(config).Error
	return config, err
}

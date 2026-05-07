package repositories

import (
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type PasswordResetRepository struct {
	db *gorm.DB
}

func NewPasswordResetRepository(db *gorm.DB) *PasswordResetRepository {
	return &PasswordResetRepository{db: db}
}

func (r *PasswordResetRepository) FindUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ?", email).First(&user).Error
	return &user, err
}

func (r *PasswordResetRepository) FindUserByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, "id = ?", id).Error
	return &user, err
}

func (r *PasswordResetRepository) CreateResetToken(reset *models.PasswordReset) error {
	return r.db.Create(reset).Error
}

func (r *PasswordResetRepository) FindValidToken(token string) (*models.PasswordReset, error) {
	var reset models.PasswordReset
	err := r.db.Where("token = ? AND expires_at > ?", token, time.Now()).First(&reset).Error
	return &reset, err
}

func (r *PasswordResetRepository) DeleteToken(id uuid.UUID) error {
	return r.db.Delete(&models.PasswordReset{}, id).Error
}

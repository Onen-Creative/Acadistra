package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// FeesRepository defines fees-specific database operations
type FeesRepository interface {
	BaseRepository
	FindStudentFees(studentID uuid.UUID, term string, year int) (*models.StudentFees, error)
	FindBySchoolAndTerm(schoolID uuid.UUID, term string, year int) ([]models.StudentFees, error)
	FindOutstanding(schoolID uuid.UUID, minAmount float64) ([]models.StudentFees, error)
	UpdateAmounts(feesID uuid.UUID, amountPaid, outstanding float64) error
	CreatePayment(payment *models.FeesPayment) error
	FindPaymentsByStudentFees(studentFeesID uuid.UUID) ([]models.FeesPayment, error)
}

type feesRepository struct {
	*baseRepository
}

// NewFeesRepository creates a new fees repository
func NewFeesRepository(db *gorm.DB) FeesRepository {
	return &feesRepository{
		baseRepository: &baseRepository{db: db},
	}
}

func (r *feesRepository) FindStudentFees(studentID uuid.UUID, term string, year int) (*models.StudentFees, error) {
	var fees models.StudentFees
	err := r.db.Where("student_id = ? AND term = ? AND year = ?", studentID, term, year).
		Preload("Student").
		First(&fees).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &fees, nil
}

func (r *feesRepository) FindBySchoolAndTerm(schoolID uuid.UUID, term string, year int) ([]models.StudentFees, error) {
	var fees []models.StudentFees
	err := r.db.Where("school_id = ? AND term = ? AND year = ?", schoolID, term, year).
		Preload("Student").
		Order("outstanding DESC").
		Find(&fees).Error
	return fees, err
}

func (r *feesRepository) FindOutstanding(schoolID uuid.UUID, minAmount float64) ([]models.StudentFees, error) {
	var fees []models.StudentFees
	err := r.db.Where("school_id = ? AND outstanding >= ?", schoolID, minAmount).
		Preload("Student").
		Order("outstanding DESC").
		Find(&fees).Error
	return fees, err
}

func (r *feesRepository) UpdateAmounts(feesID uuid.UUID, amountPaid, outstanding float64) error {
	return r.db.Model(&models.StudentFees{}).
		Where("id = ?", feesID).
		Updates(map[string]interface{}{
			"amount_paid":  amountPaid,
			"outstanding": outstanding,
		}).Error
}

func (r *feesRepository) CreatePayment(payment *models.FeesPayment) error {
	return r.db.Create(payment).Error
}

func (r *feesRepository) FindPaymentsByStudentFees(studentFeesID uuid.UUID) ([]models.FeesPayment, error) {
	var payments []models.FeesPayment
	err := r.db.Where("student_fees_id = ?", studentFeesID).
		Order("payment_date DESC").
		Find(&payments).Error
	return payments, err
}

package repositories

import (
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// FinanceRepository defines finance-specific database operations
type FinanceRepository interface {
	BaseRepository
	// Income operations
	FindIncomeBySchool(schoolID uuid.UUID, startDate, endDate time.Time) ([]models.Income, error)
	FindIncomeByCategory(schoolID uuid.UUID, category string, startDate, endDate time.Time) ([]models.Income, error)
	SumIncome(schoolID uuid.UUID, startDate, endDate time.Time) (float64, error)
	CreateIncome(income *models.Income) error
	
	// Expenditure operations
	FindExpenditureBySchool(schoolID uuid.UUID, startDate, endDate time.Time) ([]models.Expenditure, error)
	FindExpenditureByCategory(schoolID uuid.UUID, category string, startDate, endDate time.Time) ([]models.Expenditure, error)
	SumExpenditure(schoolID uuid.UUID, startDate, endDate time.Time) (float64, error)
	CreateExpenditure(expenditure *models.Expenditure) error
	UpdateExpenditureStatus(expenditureID uuid.UUID, status string) error
}

type financeRepository struct {
	*baseRepository
}

// NewFinanceRepository creates a new finance repository
func NewFinanceRepository(db *gorm.DB) FinanceRepository {
	return &financeRepository{
		baseRepository: &baseRepository{db: db},
	}
}

func (r *financeRepository) FindIncomeBySchool(schoolID uuid.UUID, startDate, endDate time.Time) ([]models.Income, error) {
	var income []models.Income
	err := r.db.Where("school_id = ? AND date BETWEEN ? AND ?", schoolID, startDate, endDate).
		Order("date DESC").
		Find(&income).Error
	return income, err
}

func (r *financeRepository) FindIncomeByCategory(schoolID uuid.UUID, category string, startDate, endDate time.Time) ([]models.Income, error) {
	var income []models.Income
	err := r.db.Where("school_id = ? AND category = ? AND date BETWEEN ? AND ?", schoolID, category, startDate, endDate).
		Order("date DESC").
		Find(&income).Error
	return income, err
}

func (r *financeRepository) SumIncome(schoolID uuid.UUID, startDate, endDate time.Time) (float64, error) {
	var total float64
	err := r.db.Model(&models.Income{}).
		Where("school_id = ? AND date BETWEEN ? AND ?", schoolID, startDate, endDate).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&total).Error
	return total, err
}

func (r *financeRepository) CreateIncome(income *models.Income) error {
	return r.db.Create(income).Error
}

func (r *financeRepository) FindExpenditureBySchool(schoolID uuid.UUID, startDate, endDate time.Time) ([]models.Expenditure, error) {
	var expenditure []models.Expenditure
	err := r.db.Where("school_id = ? AND date BETWEEN ? AND ?", schoolID, startDate, endDate).
		Order("date DESC").
		Find(&expenditure).Error
	return expenditure, err
}

func (r *financeRepository) FindExpenditureByCategory(schoolID uuid.UUID, category string, startDate, endDate time.Time) ([]models.Expenditure, error) {
	var expenditure []models.Expenditure
	err := r.db.Where("school_id = ? AND category = ? AND date BETWEEN ? AND ?", schoolID, category, startDate, endDate).
		Order("date DESC").
		Find(&expenditure).Error
	return expenditure, err
}

func (r *financeRepository) SumExpenditure(schoolID uuid.UUID, startDate, endDate time.Time) (float64, error) {
	var total float64
	err := r.db.Model(&models.Expenditure{}).
		Where("school_id = ? AND date BETWEEN ? AND ?", schoolID, startDate, endDate).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&total).Error
	return total, err
}

func (r *financeRepository) CreateExpenditure(expenditure *models.Expenditure) error {
	return r.db.Create(expenditure).Error
}

func (r *financeRepository) UpdateExpenditureStatus(expenditureID uuid.UUID, status string) error {
	return r.db.Model(&models.Expenditure{}).
		Where("id = ?", expenditureID).
		Update("status", status).Error
}

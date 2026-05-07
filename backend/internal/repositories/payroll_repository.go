package repositories

import (
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type PayrollRepository interface {
	CreateSalaryStructure(structure *models.SalaryStructure) error
	UpdateSalaryStructure(structure *models.SalaryStructure) error
	FindSalaryStructureByStaffID(staffID uint) (*models.SalaryStructure, error)
	
	CreatePayrollRecord(record *models.PayrollPayment) error
	FindPayrollRecordsBySchool(schoolID uint, year, month int) ([]models.PayrollPayment, error)
	FindPayrollRecordByID(id uint) (*models.PayrollPayment, error)
	UpdatePayrollRecord(record *models.PayrollPayment) error
}

type payrollRepository struct {
	db *gorm.DB
}

func NewPayrollRepository(db *gorm.DB) PayrollRepository {
	return &payrollRepository{db: db}
}

func (r *payrollRepository) CreateSalaryStructure(structure *models.SalaryStructure) error {
	return r.db.Create(structure).Error
}

func (r *payrollRepository) UpdateSalaryStructure(structure *models.SalaryStructure) error {
	return r.db.Save(structure).Error
}

func (r *payrollRepository) FindSalaryStructureByStaffID(staffID uint) (*models.SalaryStructure, error) {
	var structure models.SalaryStructure
	err := r.db.Where("staff_id = ?", staffID).First(&structure).Error
	return &structure, err
}

func (r *payrollRepository) CreatePayrollRecord(record *models.PayrollPayment) error {
	return r.db.Create(record).Error
}

func (r *payrollRepository) FindPayrollRecordsBySchool(schoolID uint, year, month int) ([]models.PayrollPayment, error) {
	var records []models.PayrollPayment
	query := r.db.Where("school_id = ?", schoolID)
	if year > 0 {
		query = query.Where("year = ?", year)
	}
	if month > 0 {
		query = query.Where("month = ?", month)
	}
	err := query.Preload("Staff").Order("created_at DESC").Find(&records).Error
	return records, err
}

func (r *payrollRepository) FindPayrollRecordByID(id uint) (*models.PayrollPayment, error) {
	var record models.PayrollPayment
	err := r.db.Preload("Staff").First(&record, id).Error
	return &record, err
}

func (r *payrollRepository) UpdatePayrollRecord(record *models.PayrollPayment) error {
	return r.db.Save(record).Error
}

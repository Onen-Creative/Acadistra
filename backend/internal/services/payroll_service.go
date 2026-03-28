package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type PayrollService struct {
	db *gorm.DB
}

func NewPayrollService(db *gorm.DB) *PayrollService {
	return &PayrollService{db: db}
}

func (s *PayrollService) GetDB() *gorm.DB {
	return s.db
}

// Salary Structure Management
func (s *PayrollService) CreateSalaryStructure(salary *models.SalaryStructure) error {
	return s.db.Create(salary).Error
}

func (s *PayrollService) UpdateSalaryStructure(id uint, salary *models.SalaryStructure) error {
	return s.db.Model(&models.SalaryStructure{}).Where("id = ?", id).Updates(salary).Error
}

func (s *PayrollService) DeleteSalaryStructure(id uint) error {
	return s.db.Delete(&models.SalaryStructure{}, id).Error
}

func (s *PayrollService) GetSalaryStructure(userID string) (*models.SalaryStructure, error) {
	var salary models.SalaryStructure
	err := s.db.Preload("User").Where("user_id = ?", userID).First(&salary).Error
	return &salary, err
}

func (s *PayrollService) ListSalaryStructures(schoolID string) ([]models.SalaryStructure, error) {
	var salaries []models.SalaryStructure
	err := s.db.Preload("User").Where("school_id = ?", schoolID).Find(&salaries).Error
	return salaries, err
}

// Payroll Processing
func (s *PayrollService) ProcessPayroll(schoolID string, month, year int, processedBy uint) (*models.PayrollRun, error) {
	// Check if payroll already exists
	var existing models.PayrollRun
	err := s.db.Where("school_id = ? AND month = ? AND year = ?", schoolID, month, year).First(&existing).Error
	if err == nil {
		return nil, errors.New("payroll for this period already exists")
	}

	// Get all active salary structures
	var salaries []models.SalaryStructure
	if err := s.db.Preload("User").Where("school_id = ?", schoolID).Find(&salaries).Error; err != nil {
		return nil, err
	}

	if len(salaries) == 0 {
		return nil, errors.New("no salary structures found")
	}

	// Create payroll run
	payrollRun := &models.PayrollRun{
		SchoolID:    schoolID,
		Month:       month,
		Year:        year,
		Status:      "draft",
		ProcessedBy: processedBy,
	}

	if err := s.db.Create(payrollRun).Error; err != nil {
		return nil, err
	}

	// Calculate payments for each teacher
	var totalGross, totalNet float64
	for _, salary := range salaries {
		payment := s.calculatePayment(&salary, payrollRun.ID)
		if err := s.db.Create(&payment).Error; err != nil {
			return nil, err
		}
		totalGross += payment.GrossSalary
		totalNet += payment.NetSalary
	}

	// Update payroll run totals
	payrollRun.TotalGross = totalGross
	payrollRun.TotalNet = totalNet
	now := time.Now()
	payrollRun.ProcessedAt = &now
	payrollRun.Status = "processed"

	if err := s.db.Save(payrollRun).Error; err != nil {
		return nil, err
	}

	return payrollRun, nil
}

func (s *PayrollService) calculatePayment(salary *models.SalaryStructure, payrollRunID uint) *models.PayrollPayment {
	totalAllowances := salary.HousingAllowance + salary.TransportAllowance + 
		salary.MedicalAllowance + salary.LunchAllowance + salary.OvertimeAllowance + 
		salary.PerformanceBonus + salary.OtherAllowances
	grossSalary := salary.BaseSalary + totalAllowances
	totalDeductions := salary.NSSFDeduction + salary.PAYEDeduction + 
		salary.LoanDeduction + salary.InsuranceDeduction + salary.UnionDeduction + 
		salary.OtherDeductions
	netSalary := grossSalary - totalDeductions

	return &models.PayrollPayment{
		PayrollRunID:    payrollRunID,
		UserID:          salary.UserID,
		EmployeeName:    salary.EmployeeName,
		EmployeeRole:    salary.EmployeeRole,
		EmployeeID:      salary.EmployeeID,
		BaseSalary:      salary.BaseSalary,
		TotalAllowances: totalAllowances,
		GrossSalary:     grossSalary,
		TotalDeductions: totalDeductions,
		NetSalary:       netSalary,
		PaymentStatus:   "pending",
	}
}

func (s *PayrollService) GetPayrollRun(id uint) (*models.PayrollRun, error) {
	var payroll models.PayrollRun
	err := s.db.Preload("School").Preload("Payments.User").First(&payroll, id).Error
	return &payroll, err
}

func (s *PayrollService) ListPayrollRuns(schoolID string) ([]models.PayrollRun, error) {
	var payrolls []models.PayrollRun
	err := s.db.Preload("Payments").Where("school_id = ?", schoolID).Order("year DESC, month DESC").Find(&payrolls).Error
	return payrolls, err
}

func (s *PayrollService) MarkPaymentPaid(paymentID uint, method, ref, userID string) error {
	now := time.Now()
	
	// Get payment details with payroll run
	var payment models.PayrollPayment
	if err := s.db.Preload("PayrollRun").First(&payment, paymentID).Error; err != nil {
		return err
	}
	
	// Update payment status
	if err := s.db.Model(&models.PayrollPayment{}).Where("id = ?", paymentID).Updates(map[string]interface{}{
		"payment_status": "paid",
		"payment_date":   now,
		"payment_method": method,
		"payment_ref":    ref,
	}).Error; err != nil {
		return err
	}
	
	// Create expenditure record
	schoolUUID, _ := uuid.Parse(payment.PayrollRun.SchoolID)
	recorderUUID, err := uuid.Parse(userID)
	if err != nil {
		// Fallback to system UUID if user ID is invalid
		recorderUUID = uuid.MustParse("00000000-0000-0000-0000-000000000000")
	}
	
	expenditure := models.Expenditure{
		SchoolID:    schoolUUID,
		Category:    "Salaries",
		Vendor:      payment.EmployeeName,
		Amount:      payment.NetSalary,
		Description: fmt.Sprintf("Salary payment for %s - %s %d (Ref: %s)", payment.EmployeeName, time.Month(payment.PayrollRun.Month).String(), payment.PayrollRun.Year, ref),
		Date:        now,
		Term:        s.getCurrentTerm(now),
		Year:        now.Year(),
		InvoiceNo:   ref,
		RecordedBy:  recorderUUID,
		Status:      "paid",
	}
	
	return s.db.Create(&expenditure).Error
}

func (s *PayrollService) getCurrentTerm(date time.Time) string {
	month := date.Month()
	if month >= 2 && month <= 5 {
		return "Term 1"
	} else if month >= 6 && month <= 9 {
		return "Term 2"
	}
	return "Term 3"
}

func (s *PayrollService) GetPayslip(paymentID uint) (*models.PayrollPayment, error) {
	var payment models.PayrollPayment
	err := s.db.Preload("User").Preload("PayrollRun").First(&payment, paymentID).Error
	return &payment, err
}

func (s *PayrollService) GetPayrollSummary(schoolID string, year int) (map[string]interface{}, error) {
	var payrollStats struct {
		TotalGross float64
		TotalNet   float64
		Count      int64
	}

	err := s.db.Model(&models.PayrollRun{}).
		Select("COALESCE(SUM(total_gross), 0) as total_gross, COALESCE(SUM(total_net), 0) as total_net, COUNT(*) as count").
		Where("school_id = ? AND year = ?", schoolID, year).
		Scan(&payrollStats).Error

	if err != nil {
		return nil, err
	}

	// Get total staff with salary structures
	var totalStaff int64
	s.db.Model(&models.SalaryStructure{}).Where("school_id = ?", schoolID).Count(&totalStaff)

	// Get payment statistics
	var paymentStats struct {
		TotalPaid    int64
		TotalPending int64
		PaidAmount   float64
	}
	s.db.Model(&models.PayrollPayment{}).
		Joins("JOIN payroll_runs ON payroll_runs.id = payroll_payments.payroll_run_id").
		Select("COALESCE(COUNT(CASE WHEN payroll_payments.payment_status = 'paid' THEN 1 END), 0) as total_paid, COALESCE(COUNT(CASE WHEN payroll_payments.payment_status = 'pending' THEN 1 END), 0) as total_pending, COALESCE(SUM(CASE WHEN payroll_payments.payment_status = 'paid' THEN payroll_payments.net_salary ELSE 0 END), 0) as paid_amount").
		Where("payroll_runs.school_id = ? AND payroll_runs.year = ?", schoolID, year).
		Scan(&paymentStats)

	// Get monthly breakdown
	var monthlyData []struct {
		Month      int     `json:"month"`
		TotalNet   float64 `json:"total_net"`
		TotalGross float64 `json:"total_gross"`
	}
	s.db.Model(&models.PayrollRun{}).
		Select("month, total_net, total_gross").
		Where("school_id = ? AND year = ?", schoolID, year).
		Order("month ASC").
		Scan(&monthlyData)

	averageNet := float64(0)
	if payrollStats.Count > 0 && totalStaff > 0 {
		averageNet = payrollStats.TotalNet / float64(payrollStats.Count) / float64(totalStaff)
	}

	return map[string]interface{}{
		"total_employees":   totalStaff,
		"total_gross":       payrollStats.TotalGross,
		"total_net":         payrollStats.TotalNet,
		"average_salary":    averageNet,
		"payroll_runs":      payrollStats.Count,
		"payments_paid":     paymentStats.TotalPaid,
		"payments_pending":  paymentStats.TotalPending,
		"amount_paid":       paymentStats.PaidAmount,
		"amount_pending":    payrollStats.TotalNet - paymentStats.PaidAmount,
		"monthly_breakdown": monthlyData,
	}, nil
}

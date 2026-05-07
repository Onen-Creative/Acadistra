package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type FinanceService struct {
	repo repositories.FinanceRepository
	db   *gorm.DB
}

func NewFinanceService(repo repositories.FinanceRepository, db *gorm.DB) *FinanceService {
	return &FinanceService{
		repo: repo,
		db:   db,
	}
}

// Income operations
func (s *FinanceService) CreateIncome(income *models.Income, schoolID, userID string) error {
	income.SchoolID = uuid.MustParse(schoolID)
	income.ReceivedBy = uuid.MustParse(userID)
	return s.db.Create(income).Error
}

func (s *FinanceService) ListIncome(schoolID, term, year, category, startDate, endDate string) ([]models.Income, error) {
	query := s.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("date <= ?", endDate)
	}

	var incomes []models.Income
	err := query.Order("date DESC").Find(&incomes).Error
	return incomes, err
}

func (s *FinanceService) ListIncomePaginated(schoolID, term, year, category, startDate, endDate string, page, limit int) ([]models.Income, int64, error) {
	query := s.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("date <= ?", endDate)
	}

	var total int64
	query.Model(&models.Income{}).Count(&total)

	offset := (page - 1) * limit
	var incomes []models.Income
	err := query.Order("date DESC").Offset(offset).Limit(limit).Find(&incomes).Error
	return incomes, total, err
}

func (s *FinanceService) GetIncome(id, schoolID string) (*models.Income, error) {
	var income models.Income
	err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&income).Error
	return &income, err
}

func (s *FinanceService) UpdateIncome(id, schoolID string, updates *models.Income) error {
	var income models.Income
	if err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&income).Error; err != nil {
		return fmt.Errorf("income not found")
	}

	if updates.Category != "" {
		income.Category = updates.Category
	}
	if updates.Source != "" {
		income.Source = updates.Source
	}
	if updates.Amount > 0 {
		income.Amount = updates.Amount
	}
	if updates.Description != "" {
		income.Description = updates.Description
	}
	if !updates.Date.IsZero() {
		income.Date = updates.Date
	}
	if updates.Term != "" {
		income.Term = updates.Term
	}
	if updates.Year > 0 {
		income.Year = updates.Year
	}
	if updates.ReceiptNo != "" {
		income.ReceiptNo = updates.ReceiptNo
	}

	return s.db.Save(&income).Error
}

func (s *FinanceService) DeleteIncome(id, schoolID string) error {
	return s.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Income{}).Error
}

// Expenditure operations
func (s *FinanceService) CreateExpenditure(expenditure *models.Expenditure, schoolID, userID string) error {
	expenditure.SchoolID = uuid.MustParse(schoolID)
	expenditure.RecordedBy = uuid.MustParse(userID)
	userUUID := uuid.MustParse(userID)
	expenditure.ApprovedBy = &userUUID
	if expenditure.Status == "" {
		expenditure.Status = "approved"
	}
	return s.db.Create(expenditure).Error
}

func (s *FinanceService) ListExpenditure(schoolID, term, year, category, status, startDate, endDate string) ([]models.Expenditure, error) {
	query := s.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("date <= ?", endDate)
	}

	var expenditures []models.Expenditure
	err := query.Order("date DESC").Find(&expenditures).Error
	return expenditures, err
}

func (s *FinanceService) ListExpenditurePaginated(schoolID, term, year, category, status, startDate, endDate string, page, limit int) ([]models.Expenditure, int64, error) {
	query := s.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("date <= ?", endDate)
	}

	var total int64
	query.Model(&models.Expenditure{}).Count(&total)

	offset := (page - 1) * limit
	var expenditures []models.Expenditure
	err := query.Order("date DESC").Offset(offset).Limit(limit).Find(&expenditures).Error
	return expenditures, total, err
}

func (s *FinanceService) GetExpenditure(id, schoolID string) (*models.Expenditure, error) {
	var expenditure models.Expenditure
	err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&expenditure).Error
	return &expenditure, err
}

func (s *FinanceService) UpdateExpenditure(id, schoolID string, updates *models.Expenditure) error {
	var expenditure models.Expenditure
	if err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&expenditure).Error; err != nil {
		return fmt.Errorf("expenditure not found")
	}

	if updates.Category != "" {
		expenditure.Category = updates.Category
	}
	if updates.Vendor != "" {
		expenditure.Vendor = updates.Vendor
	}
	if updates.Amount > 0 {
		expenditure.Amount = updates.Amount
	}
	if updates.Description != "" {
		expenditure.Description = updates.Description
	}
	if !updates.Date.IsZero() {
		expenditure.Date = updates.Date
	}
	if updates.Term != "" {
		expenditure.Term = updates.Term
	}
	if updates.Year > 0 {
		expenditure.Year = updates.Year
	}
	if updates.InvoiceNo != "" {
		expenditure.InvoiceNo = updates.InvoiceNo
	}
	if updates.Status != "" {
		expenditure.Status = updates.Status
	}

	return s.db.Save(&expenditure).Error
}

func (s *FinanceService) DeleteExpenditure(id, schoolID string) error {
	return s.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Expenditure{}).Error
}

// Financial summary
func (s *FinanceService) GetFinancialSummary(schoolID, term, year, startDate, endDate string) (map[string]interface{}, error) {
	incomeQuery := s.db.Model(&models.Income{}).Where("school_id = ?", schoolID)
	expenseQuery := s.db.Model(&models.Expenditure{}).Where("school_id = ?", schoolID)

	if term != "" {
		normalizedTerm := term
		switch term {
		case "Term1":
			normalizedTerm = "Term 1"
		case "Term2":
			normalizedTerm = "Term 2"
		case "Term3":
			normalizedTerm = "Term 3"
		}
		incomeQuery = incomeQuery.Where("term = ?", normalizedTerm)
		expenseQuery = expenseQuery.Where("term = ?", normalizedTerm)
	}
	if year != "" {
		incomeQuery = incomeQuery.Where("year = ?", year)
		expenseQuery = expenseQuery.Where("year = ?", year)
	}
	if startDate != "" {
		incomeQuery = incomeQuery.Where("date >= ?", startDate)
		expenseQuery = expenseQuery.Where("date >= ?", startDate)
	}
	if endDate != "" {
		incomeQuery = incomeQuery.Where("date <= ?", endDate)
		expenseQuery = expenseQuery.Where("date <= ?", endDate)
	}

	var totalIncome, totalExpenditure float64
	incomeQuery.Select("COALESCE(SUM(amount), 0)").Scan(&totalIncome)
	expenseQuery.Select("COALESCE(SUM(amount), 0)").Scan(&totalExpenditure)

	// Income by category
	var incomeCategories []struct {
		Category string
		Total    float64
	}
	incomeQuery.Select("category, SUM(amount) as total").Group("category").Scan(&incomeCategories)

	incomeByCategory := make(map[string]float64)
	for _, cat := range incomeCategories {
		incomeByCategory[cat.Category] = cat.Total
	}

	// Expense by category
	var expenseCategories []struct {
		Category string
		Total    float64
	}
	expenseQuery.Select("category, SUM(amount) as total").Group("category").Scan(&expenseCategories)

	expenseByCategory := make(map[string]float64)
	for _, cat := range expenseCategories {
		expenseByCategory[cat.Category] = cat.Total
	}

	return map[string]interface{}{
		"total_income":        totalIncome,
		"total_expenditure":   totalExpenditure,
		"net_balance":         totalIncome - totalExpenditure,
		"income_by_category":  incomeByCategory,
		"expense_by_category": expenseByCategory,
	}, nil
}

// Export data for reports
func (s *FinanceService) GetExportData(schoolID, period, term, year string) ([]models.Income, []models.Expenditure, error) {
	incomeQuery := s.db.Model(&models.Income{}).Where("school_id = ?", schoolID)
	expenseQuery := s.db.Model(&models.Expenditure{}).Where("school_id = ?", schoolID)

	now := time.Now()
	var startDate, endDate time.Time

	switch period {
	case "daily":
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		endDate = startDate.Add(24 * time.Hour)
	case "weekly":
		startDate = now.AddDate(0, 0, -7)
		endDate = now
	case "monthly":
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 1, 0)
	case "termly":
		if term != "" && year != "" {
			incomeQuery = incomeQuery.Where("term = ? AND year = ?", term, year)
			expenseQuery = expenseQuery.Where("term = ? AND year = ?", term, year)
		}
	case "yearly":
		if year != "" {
			incomeQuery = incomeQuery.Where("year = ?", year)
			expenseQuery = expenseQuery.Where("year = ?", year)
		}
	}

	if period == "daily" || period == "weekly" || period == "monthly" {
		incomeQuery = incomeQuery.Where("date >= ? AND date < ?", startDate, endDate)
		expenseQuery = expenseQuery.Where("date >= ? AND date < ?", startDate, endDate)
	}

	var incomes []models.Income
	var expenditures []models.Expenditure

	incomeQuery.Order("date DESC").Find(&incomes)
	expenseQuery.Order("date DESC").Find(&expenditures)

	return incomes, expenditures, nil
}


func (s *FinanceService) GetFeesExportData(schoolID, period, term, year string) ([]models.FeesPayment, []models.StudentFees, string, error) {
	now := time.Now()
	var startDate, endDate time.Time
	var reportTitle string

	switch period {
	case "daily":
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		endDate = startDate.Add(24 * time.Hour)
		reportTitle = fmt.Sprintf("Daily School Fees Report - %s", startDate.Format("2006-01-02"))
	case "weekly":
		startDate = now.AddDate(0, 0, -7)
		endDate = now
		reportTitle = fmt.Sprintf("Weekly School Fees Report - %s to %s", startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	case "monthly":
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 1, 0)
		reportTitle = fmt.Sprintf("Monthly School Fees Report - %s", startDate.Format("January 2006"))
	case "termly":
		if term != "" && year != "" {
			reportTitle = fmt.Sprintf("Term %s School Fees Report - %s", term, year)
		}
	case "yearly":
		if year != "" {
			reportTitle = fmt.Sprintf("Yearly School Fees Report - %s", year)
		}
	default:
		reportTitle = "School Fees Report - All Time"
	}

	var payments []models.FeesPayment
	var fees []models.StudentFees
	paymentsQuery := s.db.Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").Where("student_fees.school_id = ?", schoolID)
	feesQuery := s.db.Where("school_id = ?", schoolID)

	if period == "termly" && term != "" && year != "" {
		paymentsQuery = paymentsQuery.Where("student_fees.term = ? AND student_fees.year = ?", term, year)
		feesQuery = feesQuery.Where("term = ? AND year = ?", term, year)
	} else if period == "yearly" && year != "" {
		paymentsQuery = paymentsQuery.Where("student_fees.year = ?", year)
		feesQuery = feesQuery.Where("year = ?", year)
	} else if period == "daily" || period == "weekly" || period == "monthly" {
		paymentsQuery = paymentsQuery.Where("fees_payments.payment_date >= ? AND fees_payments.payment_date < ?", startDate, endDate)
	}

	paymentsQuery.Select("fees_payments.*").Find(&payments)
	feesQuery.Find(&fees)

	for i := range payments {
		var studentFees models.StudentFees
		if err := s.db.Preload("Student").Where("id = ?", payments[i].StudentFeesID).First(&studentFees).Error; err == nil {
			payments[i].StudentFees = &studentFees
		}
	}

	return payments, fees, reportTitle, nil
}

func (s *FinanceService) GetPaymentStudentInfo(payment models.FeesPayment) (string, string, string, string) {
	studentName := "Unknown"
	className := ""
	guardianName := ""
	guardianPhone := ""

	if payment.StudentFees != nil && payment.StudentFees.Student != nil {
		student := payment.StudentFees.Student
		studentName = student.FirstName
		if student.MiddleName != "" {
			studentName += " " + student.MiddleName
		}
		studentName += " " + student.LastName

		var enrollment models.Enrollment
		if err := s.db.Preload("Class").Where("student_id = ? AND status = 'active'", student.ID).First(&enrollment).Error; err == nil {
			if enrollment.Class != nil {
				className = enrollment.Class.Name
			}
		}

		var guardians []models.Guardian
		s.db.Where("student_id = ?", student.ID).Find(&guardians)
		for _, g := range guardians {
			if g.IsPrimaryContact {
				guardianName = g.FullName
				guardianPhone = g.Phone
				break
			}
		}
		if guardianName == "" && len(guardians) > 0 {
			guardianName = guardians[0].FullName
			guardianPhone = guardians[0].Phone
		}
	}

	return studentName, className, guardianName, guardianPhone
}

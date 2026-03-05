package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type FinanceHandler struct {
	db *gorm.DB
}

func NewFinanceHandler(db *gorm.DB) *FinanceHandler {
	return &FinanceHandler{db: db}
}

// CreateIncome records new income
func (h *FinanceHandler) CreateIncome(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")

	var input struct {
		Category    string  `json:"category" binding:"required"`
		Source      string  `json:"source"`
		Amount      float64 `json:"amount" binding:"required,gt=0"`
		Description string  `json:"description"`
		Date        string  `json:"date" binding:"required"`
		Term        string  `json:"term"`
		Year        int     `json:"year"`
		ReceiptNo   string  `json:"receipt_no"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	income := models.Income{
		SchoolID:    uuid.MustParse(schoolID),
		Category:    input.Category,
		Source:      input.Source,
		Amount:      input.Amount,
		Description: input.Description,
		Date:        date,
		Term:        input.Term,
		Year:        input.Year,
		ReceiptNo:   input.ReceiptNo,
		ReceivedBy:  uuid.MustParse(userID),
	}

	if err := h.db.Create(&income).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create income"})
		return
	}

	c.JSON(http.StatusCreated, income)
}

// ListIncome retrieves income records
func (h *FinanceHandler) ListIncome(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	category := c.Query("category")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	query := h.db.Where("school_id = ?", schoolID)
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
	if err := query.Order("date DESC").Find(&incomes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch income"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"incomes": incomes})
}

// CreateExpenditure records new expenditure
func (h *FinanceHandler) CreateExpenditure(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")

	var input struct {
		Category    string  `json:"category" binding:"required"`
		Vendor      string  `json:"vendor"`
		Amount      float64 `json:"amount" binding:"required,gt=0"`
		Description string  `json:"description"`
		Date        string  `json:"date" binding:"required"`
		Term        string  `json:"term"`
		Year        int     `json:"year"`
		InvoiceNo   string  `json:"invoice_no"`
		Status      string  `json:"status"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	status := input.Status
	if status == "" {
		status = "approved"
	}

	userUUID := uuid.MustParse(userID)
	expenditure := models.Expenditure{
		SchoolID:    uuid.MustParse(schoolID),
		Category:    input.Category,
		Vendor:      input.Vendor,
		Amount:      input.Amount,
		Description: input.Description,
		Date:        date,
		Term:        input.Term,
		Year:        input.Year,
		InvoiceNo:   input.InvoiceNo,
		ApprovedBy:  &userUUID,
		RecordedBy:  userUUID,
		Status:      status,
	}

	if err := h.db.Create(&expenditure).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expenditure"})
		return
	}

	c.JSON(http.StatusCreated, expenditure)
}

// ListExpenditure retrieves expenditure records
func (h *FinanceHandler) ListExpenditure(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	category := c.Query("category")


	query := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	status := c.Query("status")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	startDate := c.Query("start_date")
	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	endDate := c.Query("end_date")
	if endDate != "" {
		query = query.Where("date <= ?", endDate)
	}

	var expenditures []models.Expenditure
	if err := query.Order("date DESC").Find(&expenditures).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expenditure"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"expenditures": expenditures})
}

// GetFinancialSummary provides financial overview
func (h *FinanceHandler) GetFinancialSummary(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	yearStr := c.Query("year")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")


	type Summary struct {
		TotalIncome       float64            `json:"total_income"`
		TotalExpenditure  float64            `json:"total_expenditure"`
		NetBalance        float64            `json:"net_balance"`
		IncomeByCategory  map[string]float64 `json:"income_by_category"`
		ExpenseByCategory map[string]float64 `json:"expense_by_category"`
	}

	summary := Summary{
		IncomeByCategory:  make(map[string]float64),
		ExpenseByCategory: make(map[string]float64),
	}

	// Build query filters
	incomeQuery := h.db.Model(&models.Income{}).Where("school_id = ?", schoolID)
	expenseQuery := h.db.Model(&models.Expenditure{}).Where("school_id = ?", schoolID)

	if term != "" {
		// Convert Term1/Term2/Term3 to "Term 1"/"Term 2"/"Term 3" format
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
	if yearStr != "" {
		year, err := strconv.Atoi(yearStr)
		if err == nil && year > 0 {
			incomeQuery = incomeQuery.Where("year = ?", year)
			expenseQuery = expenseQuery.Where("year = ?", year)
		}
	}
	if startDate != "" {
		incomeQuery = incomeQuery.Where("date >= ?", startDate)
		expenseQuery = expenseQuery.Where("date >= ?", startDate)
	}
	if endDate != "" {
		incomeQuery = incomeQuery.Where("date <= ?", endDate)
		expenseQuery = expenseQuery.Where("date <= ?", endDate)
	}

	// Total income
	var incomeCount int64
	h.db.Model(&models.Income{}).Where("school_id = ?", schoolID).Count(&incomeCount)
	
	// Test without filters first
	var totalIncomeNoFilter float64
	h.db.Model(&models.Income{}).Where("school_id = ?", schoolID).Select("COALESCE(SUM(amount), 0)").Scan(&totalIncomeNoFilter)
	
	incomeQuery.Select("COALESCE(SUM(amount), 0)").Scan(&summary.TotalIncome)

	// Total expenditure
	var expenseCount int64
	h.db.Model(&models.Expenditure{}).Where("school_id = ?", schoolID).Count(&expenseCount)
	
	// Test without filters first
	var totalExpenseNoFilter float64
	h.db.Model(&models.Expenditure{}).Where("school_id = ?", schoolID).Select("COALESCE(SUM(amount), 0)").Scan(&totalExpenseNoFilter)
	
	expenseQuery.Select("COALESCE(SUM(amount), 0)").Scan(&summary.TotalExpenditure)

	// Net balance
	summary.NetBalance = summary.TotalIncome - summary.TotalExpenditure

	// Income by category
	var incomeCategories []struct {
		Category string
		Total    float64
	}
	incomeQuery.Select("category, SUM(amount) as total").Group("category").Scan(&incomeCategories)
	for _, cat := range incomeCategories {
		summary.IncomeByCategory[cat.Category] = cat.Total
	}

	// Expense by category
	var expenseCategories []struct {
		Category string
		Total    float64
	}
	expenseQuery.Select("category, SUM(amount) as total").Group("category").Scan(&expenseCategories)
	for _, cat := range expenseCategories {
		summary.ExpenseByCategory[cat.Category] = cat.Total
	}

	c.JSON(http.StatusOK, summary)
}

// DeleteIncome deletes an income record
func (h *FinanceHandler) DeleteIncome(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Income{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete income"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Income deleted successfully"})
}

// DeleteExpenditure deletes an expenditure record
func (h *FinanceHandler) DeleteExpenditure(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Expenditure{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expenditure"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expenditure deleted successfully"})
}

// UpdateIncome updates an income record
func (h *FinanceHandler) UpdateIncome(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	var input struct {
		Category    string  `json:"category"`
		Source      string  `json:"source"`
		Amount      float64 `json:"amount"`
		Description string  `json:"description"`
		Date        string  `json:"date"`
		Term        string  `json:"term"`
		Year        int     `json:"year"`
		ReceiptNo   string  `json:"receipt_no"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var income models.Income
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&income).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Income not found"})
		return
	}

	if input.Date != "" {
		date, err := time.Parse("2006-01-02", input.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
			return
		}
		income.Date = date
	}

	if input.Category != "" {
		income.Category = input.Category
	}
	if input.Source != "" {
		income.Source = input.Source
	}
	if input.Amount > 0 {
		income.Amount = input.Amount
	}
	if input.Description != "" {
		income.Description = input.Description
	}
	if input.Term != "" {
		income.Term = input.Term
	}
	if input.Year > 0 {
		income.Year = input.Year
	}
	if input.ReceiptNo != "" {
		income.ReceiptNo = input.ReceiptNo
	}

	if err := h.db.Save(&income).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update income"})
		return
	}

	c.JSON(http.StatusOK, income)
}

// UpdateExpenditure updates an expenditure record
func (h *FinanceHandler) UpdateExpenditure(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	var input struct {
		Category    string  `json:"category"`
		Vendor      string  `json:"vendor"`
		Amount      float64 `json:"amount"`
		Description string  `json:"description"`
		Date        string  `json:"date"`
		Term        string  `json:"term"`
		Year        int     `json:"year"`
		InvoiceNo   string  `json:"invoice_no"`
		Status      string  `json:"status"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var expenditure models.Expenditure
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&expenditure).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expenditure not found"})
		return
	}

	if input.Date != "" {
		date, err := time.Parse("2006-01-02", input.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
			return
		}
		expenditure.Date = date
	}

	if input.Category != "" {
		expenditure.Category = input.Category
	}
	if input.Vendor != "" {
		expenditure.Vendor = input.Vendor
	}
	if input.Amount > 0 {
		expenditure.Amount = input.Amount
	}
	if input.Description != "" {
		expenditure.Description = input.Description
	}
	if input.Term != "" {
		expenditure.Term = input.Term
	}
	if input.Year > 0 {
		expenditure.Year = input.Year
	}
	if input.InvoiceNo != "" {
		expenditure.InvoiceNo = input.InvoiceNo
	}
	if input.Status != "" {
		expenditure.Status = input.Status
	}

	if err := h.db.Save(&expenditure).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expenditure"})
		return
	}

	c.JSON(http.StatusOK, expenditure)
}

// GetIncome retrieves a single income record
func (h *FinanceHandler) GetIncome(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	var income models.Income
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&income).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Income not found"})
		return
	}

	c.JSON(http.StatusOK, income)
}

// GetExpenditure retrieves a single expenditure record
func (h *FinanceHandler) GetExpenditure(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	var expenditure models.Expenditure
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&expenditure).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expenditure not found"})
		return
	}

	c.JSON(http.StatusOK, expenditure)
}

// ExportFinanceReport generates XLSX report
func (h *FinanceHandler) ExportFinanceReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	period := c.Query("period") // daily, weekly, monthly, termly, yearly
	term := c.Query("term")
	yearStr := c.Query("year")

	// Build query filters
	incomeQuery := h.db.Model(&models.Income{}).Where("school_id = ?", schoolID)
	expenseQuery := h.db.Model(&models.Expenditure{}).Where("school_id = ?", schoolID)

	now := time.Now()
	var startDate, endDate time.Time
	var reportTitle string

	switch period {
	case "daily":
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		endDate = startDate.Add(24 * time.Hour)
		reportTitle = fmt.Sprintf("Daily Finance Report - %s", startDate.Format("2006-01-02"))
	case "weekly":
		startDate = now.AddDate(0, 0, -7)
		endDate = now
		reportTitle = fmt.Sprintf("Weekly Finance Report - %s to %s", startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	case "monthly":
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 1, 0)
		reportTitle = fmt.Sprintf("Monthly Finance Report - %s", startDate.Format("January 2006"))
	case "termly":
		if term != "" && yearStr != "" {
			year, _ := strconv.Atoi(yearStr)
			incomeQuery = incomeQuery.Where("term = ? AND year = ?", term, year)
			expenseQuery = expenseQuery.Where("term = ? AND year = ?", term, year)
			reportTitle = fmt.Sprintf("Term %s Finance Report - %d", term, year)
		}
	case "yearly":
		if yearStr != "" {
			year, _ := strconv.Atoi(yearStr)
			incomeQuery = incomeQuery.Where("year = ?", year)
			expenseQuery = expenseQuery.Where("year = ?", year)
			reportTitle = fmt.Sprintf("Yearly Finance Report - %d", year)
		}
	default:
		reportTitle = "Finance Report - All Time"
	}

	if period == "daily" || period == "weekly" || period == "monthly" {
		incomeQuery = incomeQuery.Where("date >= ? AND date < ?", startDate, endDate)
		expenseQuery = expenseQuery.Where("date >= ? AND date < ?", startDate, endDate)
	}

	// Fetch data
	var incomes []models.Income
	var expenditures []models.Expenditure
	
	incomeQuery.Order("date DESC").Find(&incomes)
	expenseQuery.Order("date DESC").Find(&expenditures)

	// Calculate totals
	var totalIncome, totalExpenditure float64
	
	for _, inc := range incomes {
		totalIncome += inc.Amount
	}
	for _, exp := range expenditures {
		totalExpenditure += exp.Amount
	}

	// Create Excel file
	f := excelize.NewFile()
	defer f.Close()

	// Summary Sheet
	f.SetCellValue("Sheet1", "A1", reportTitle)
	f.SetCellValue("Sheet1", "A3", "Finance Summary")
	f.SetCellValue("Sheet1", "A4", "Total Income:")
	f.SetCellValue("Sheet1", "B4", totalIncome)
	f.SetCellValue("Sheet1", "A5", "Total Expenditure:")
	f.SetCellValue("Sheet1", "B5", totalExpenditure)
	f.SetCellValue("Sheet1", "A6", "Net Balance:")
	f.SetCellValue("Sheet1", "B6", totalIncome-totalExpenditure)

	// Income Sheet
	f.NewSheet("Income")
	f.SetCellValue("Income", "A1", "Date")
	f.SetCellValue("Income", "B1", "Category")
	f.SetCellValue("Income", "C1", "Source")
	f.SetCellValue("Income", "D1", "Amount")
	f.SetCellValue("Income", "E1", "Receipt No")
	f.SetCellValue("Income", "F1", "Description")
	f.SetCellValue("Income", "G1", "Term")
	f.SetCellValue("Income", "H1", "Year")

	for i, inc := range incomes {
		row := i + 2
		f.SetCellValue("Income", fmt.Sprintf("A%d", row), inc.Date.Format("2006-01-02"))
		f.SetCellValue("Income", fmt.Sprintf("B%d", row), inc.Category)
		f.SetCellValue("Income", fmt.Sprintf("C%d", row), inc.Source)
		f.SetCellValue("Income", fmt.Sprintf("D%d", row), inc.Amount)
		f.SetCellValue("Income", fmt.Sprintf("E%d", row), inc.ReceiptNo)
		f.SetCellValue("Income", fmt.Sprintf("F%d", row), inc.Description)
		f.SetCellValue("Income", fmt.Sprintf("G%d", row), inc.Term)
		f.SetCellValue("Income", fmt.Sprintf("H%d", row), inc.Year)
	}

	// Expenditure Sheet
	f.NewSheet("Expenditure")
	f.SetCellValue("Expenditure", "A1", "Date")
	f.SetCellValue("Expenditure", "B1", "Category")
	f.SetCellValue("Expenditure", "C1", "Vendor")
	f.SetCellValue("Expenditure", "D1", "Amount")
	f.SetCellValue("Expenditure", "E1", "Invoice No")
	f.SetCellValue("Expenditure", "F1", "Description")
	f.SetCellValue("Expenditure", "G1", "Term")
	f.SetCellValue("Expenditure", "H1", "Year")
	f.SetCellValue("Expenditure", "I1", "Status")

	for i, exp := range expenditures {
		row := i + 2
		f.SetCellValue("Expenditure", fmt.Sprintf("A%d", row), exp.Date.Format("2006-01-02"))
		f.SetCellValue("Expenditure", fmt.Sprintf("B%d", row), exp.Category)
		f.SetCellValue("Expenditure", fmt.Sprintf("C%d", row), exp.Vendor)
		f.SetCellValue("Expenditure", fmt.Sprintf("D%d", row), exp.Amount)
		f.SetCellValue("Expenditure", fmt.Sprintf("E%d", row), exp.InvoiceNo)
		f.SetCellValue("Expenditure", fmt.Sprintf("F%d", row), exp.Description)
		f.SetCellValue("Expenditure", fmt.Sprintf("G%d", row), exp.Term)
		f.SetCellValue("Expenditure", fmt.Sprintf("H%d", row), exp.Year)
		f.SetCellValue("Expenditure", fmt.Sprintf("I%d", row), exp.Status)
	}

	f.DeleteSheet("Sheet1")
	idx, _ := f.GetSheetIndex("Income")
	f.SetActiveSheet(idx)

	// Send file
	filename := fmt.Sprintf("finance_report_%s_%s.xlsx", period, time.Now().Format("20060102"))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
	}
}

// ExportFeesReport generates XLSX report for school fees only
func (h *FinanceHandler) ExportFeesReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	period := c.Query("period")
	term := c.Query("term")
	yearStr := c.Query("year")

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
		if term != "" && yearStr != "" {
			year, _ := strconv.Atoi(yearStr)
			reportTitle = fmt.Sprintf("Term %s School Fees Report - %d", term, year)
		}
	case "yearly":
		if yearStr != "" {
			year, _ := strconv.Atoi(yearStr)
			reportTitle = fmt.Sprintf("Yearly School Fees Report - %d", year)
		}
	default:
		reportTitle = "School Fees Report - All Time"
	}

	// Get school fees data
	var payments []models.FeesPayment
	var fees []models.StudentFees
	paymentsQuery := h.db.Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").Where("student_fees.school_id = ?", schoolID)
	feesQuery := h.db.Where("school_id = ?", schoolID)
	
	if period == "termly" && term != "" && yearStr != "" {
		year, _ := strconv.Atoi(yearStr)
		paymentsQuery = paymentsQuery.Where("student_fees.term = ? AND student_fees.year = ?", term, year)
		feesQuery = feesQuery.Where("term = ? AND year = ?", term, year)
	} else if period == "yearly" && yearStr != "" {
		year, _ := strconv.Atoi(yearStr)
		paymentsQuery = paymentsQuery.Where("student_fees.year = ?", year)
		feesQuery = feesQuery.Where("year = ?", year)
	} else if period == "daily" || period == "weekly" || period == "monthly" {
		paymentsQuery = paymentsQuery.Where("fees_payments.payment_date >= ? AND fees_payments.payment_date < ?", startDate, endDate)
	}
	
	paymentsQuery.Select("fees_payments.*").Find(&payments)
	feesQuery.Find(&fees)
	
	// Load full student data with guardians and class for each payment
	for i := range payments {
		var studentFees models.StudentFees
		if err := h.db.Where("id = ?", payments[i].StudentFeesID).First(&studentFees).Error; err == nil {
			var student models.Student
			if err := h.db.Where("id = ?", studentFees.StudentID).First(&student).Error; err == nil {
				studentFees.Student = &student
			}
			payments[i].StudentFees = &studentFees
		}
	}

	var totalPaid, totalFees, totalOutstanding float64
	for _, payment := range payments {
		totalPaid += payment.Amount
	}
	for _, fee := range fees {
		totalFees += fee.TotalFees
		totalOutstanding += fee.Outstanding
	}

	f := excelize.NewFile()
	defer f.Close()

	// Summary
	f.SetCellValue("Sheet1", "A1", reportTitle)
	f.SetCellValue("Sheet1", "A3", "Summary")
	f.SetCellValue("Sheet1", "A4", "Total Fees Expected:")
	f.SetCellValue("Sheet1", "B4", totalFees)
	f.SetCellValue("Sheet1", "A5", "Total Amount Paid:")
	f.SetCellValue("Sheet1", "B5", totalPaid)
	f.SetCellValue("Sheet1", "A6", "Outstanding Balance:")
	f.SetCellValue("Sheet1", "B6", totalOutstanding)
	f.SetCellValue("Sheet1", "A7", "Number of Payments:")
	f.SetCellValue("Sheet1", "B7", len(payments))

	// Payments
	f.NewSheet("Payments")
	f.SetCellValue("Payments", "A1", "Date")
	f.SetCellValue("Payments", "B1", "Student Name")
	f.SetCellValue("Payments", "C1", "Class")
	f.SetCellValue("Payments", "D1", "Parent/Guardian")
	f.SetCellValue("Payments", "E1", "Contact")
	f.SetCellValue("Payments", "F1", "Total Fees")
	f.SetCellValue("Payments", "G1", "Amount Paid")
	f.SetCellValue("Payments", "H1", "Outstanding")
	f.SetCellValue("Payments", "I1", "Payment Amount")
	f.SetCellValue("Payments", "J1", "Payment Method")
	f.SetCellValue("Payments", "K1", "Receipt No")
	f.SetCellValue("Payments", "L1", "Notes")
	
	for i, payment := range payments {
		row := i + 2
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
			
			// Get class
			var enrollment models.Enrollment
			if err := h.db.Preload("Class").Where("student_id = ? AND status = 'active'", student.ID).First(&enrollment).Error; err == nil {
				if enrollment.Class != nil {
					className = enrollment.Class.Name
				}
			}
			
			// Get guardian
			var guardians []models.Guardian
			h.db.Where("student_id = ?", student.ID).Find(&guardians)
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
		
		f.SetCellValue("Payments", fmt.Sprintf("A%d", row), payment.PaymentDate.Format("2006-01-02"))
		f.SetCellValue("Payments", fmt.Sprintf("B%d", row), studentName)
		f.SetCellValue("Payments", fmt.Sprintf("C%d", row), className)
		f.SetCellValue("Payments", fmt.Sprintf("D%d", row), guardianName)
		f.SetCellValue("Payments", fmt.Sprintf("E%d", row), guardianPhone)
		
		// Get student fees totals
		var studentFees models.StudentFees
		if err := h.db.Where("id = ?", payment.StudentFeesID).First(&studentFees).Error; err == nil {
			f.SetCellValue("Payments", fmt.Sprintf("F%d", row), studentFees.TotalFees)
			f.SetCellValue("Payments", fmt.Sprintf("G%d", row), studentFees.AmountPaid)
			f.SetCellValue("Payments", fmt.Sprintf("H%d", row), studentFees.Outstanding)
		}
		
		f.SetCellValue("Payments", fmt.Sprintf("I%d", row), payment.Amount)
		f.SetCellValue("Payments", fmt.Sprintf("J%d", row), payment.PaymentMethod)
		f.SetCellValue("Payments", fmt.Sprintf("K%d", row), payment.ReceiptNo)
		f.SetCellValue("Payments", fmt.Sprintf("L%d", row), payment.Notes)
	}

	f.DeleteSheet("Sheet1")
	idx, _ := f.GetSheetIndex("Payments")
	f.SetActiveSheet(idx)

	filename := fmt.Sprintf("school_fees_report_%s_%s.xlsx", period, time.Now().Format("20060102"))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
	}
}

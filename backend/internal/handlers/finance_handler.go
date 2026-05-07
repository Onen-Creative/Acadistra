package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"github.com/xuri/excelize/v2"
)

type FinanceHandler struct {
	service *services.FinanceService
}

func NewFinanceHandler(service *services.FinanceService) *FinanceHandler {
	return &FinanceHandler{
		service: service,
	}
}

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

	income := &models.Income{
		Category:    input.Category,
		Source:      input.Source,
		Amount:      input.Amount,
		Description: input.Description,
		Date:        date,
		Term:        input.Term,
		Year:        input.Year,
		ReceiptNo:   input.ReceiptNo,
	}

	if err := h.service.CreateIncome(income, schoolID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create income"})
		return
	}

	c.JSON(http.StatusCreated, income)
}

func (h *FinanceHandler) ListIncome(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	category := c.Query("category")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	page := 1
	limit := 20

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	incomes, total, err := h.service.ListIncomePaginated(schoolID, term, year, category, startDate, endDate, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch income"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"incomes": incomes, "total": total, "page": page, "limit": limit})
}

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

	expenditure := &models.Expenditure{
		Category:    input.Category,
		Vendor:      input.Vendor,
		Amount:      input.Amount,
		Description: input.Description,
		Date:        date,
		Term:        input.Term,
		Year:        input.Year,
		InvoiceNo:   input.InvoiceNo,
		Status:      status,
	}

	if err := h.service.CreateExpenditure(expenditure, schoolID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expenditure"})
		return
	}

	c.JSON(http.StatusCreated, expenditure)
}

func (h *FinanceHandler) ListExpenditure(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	category := c.Query("category")
	status := c.Query("status")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	page := 1
	limit := 20

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	expenditures, total, err := h.service.ListExpenditurePaginated(schoolID, term, year, category, status, startDate, endDate, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expenditure"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"expenditures": expenditures, "total": total, "page": page, "limit": limit})
}

func (h *FinanceHandler) GetFinancialSummary(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	summary, err := h.service.GetFinancialSummary(schoolID, term, year, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

func (h *FinanceHandler) DeleteIncome(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	if err := h.service.DeleteIncome(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete income"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Income deleted successfully"})
}

func (h *FinanceHandler) DeleteExpenditure(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	if err := h.service.DeleteExpenditure(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expenditure"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expenditure deleted successfully"})
}

func (h *FinanceHandler) UpdateIncome(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	var updates models.Income
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateIncome(id, schoolID, &updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update income"})
		return
	}

	income, _ := h.service.GetIncome(id, schoolID)
	c.JSON(http.StatusOK, income)
}

func (h *FinanceHandler) UpdateExpenditure(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	var updates models.Expenditure
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateExpenditure(id, schoolID, &updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expenditure"})
		return
	}

	expenditure, _ := h.service.GetExpenditure(id, schoolID)
	c.JSON(http.StatusOK, expenditure)
}

func (h *FinanceHandler) GetIncome(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	income, err := h.service.GetIncome(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Income not found"})
		return
	}

	c.JSON(http.StatusOK, income)
}

func (h *FinanceHandler) GetExpenditure(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	id := c.Param("id")

	expenditure, err := h.service.GetExpenditure(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expenditure not found"})
		return
	}

	c.JSON(http.StatusOK, expenditure)
}

func (h *FinanceHandler) ExportFinanceReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	period := c.Query("period")
	term := c.Query("term")
	year := c.Query("year")

	incomes, expenditures, err := h.service.GetExportData(schoolID, period, term, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get export data"})
		return
	}

	now := time.Now()
	var reportTitle string
	switch period {
	case "daily":
		reportTitle = fmt.Sprintf("Daily Finance Report - %s", now.Format("2006-01-02"))
	case "weekly":
		reportTitle = fmt.Sprintf("Weekly Finance Report - %s", now.Format("2006-01-02"))
	case "monthly":
		reportTitle = fmt.Sprintf("Monthly Finance Report - %s", now.Format("January 2006"))
	case "termly":
		reportTitle = fmt.Sprintf("Term %s Finance Report - %s", term, year)
	case "yearly":
		reportTitle = fmt.Sprintf("Yearly Finance Report - %s", year)
	default:
		reportTitle = "Finance Report - All Time"
	}

	var totalIncome, totalExpenditure float64
	for _, inc := range incomes {
		totalIncome += inc.Amount
	}
	for _, exp := range expenditures {
		totalExpenditure += exp.Amount
	}

	f := excelize.NewFile()
	defer f.Close()

	f.SetCellValue("Sheet1", "A1", reportTitle)
	f.SetCellValue("Sheet1", "A3", "Finance Summary")
	f.SetCellValue("Sheet1", "A4", "Total Income:")
	f.SetCellValue("Sheet1", "B4", totalIncome)
	f.SetCellValue("Sheet1", "A5", "Total Expenditure:")
	f.SetCellValue("Sheet1", "B5", totalExpenditure)
	f.SetCellValue("Sheet1", "A6", "Net Balance:")
	f.SetCellValue("Sheet1", "B6", totalIncome-totalExpenditure)

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

	filename := fmt.Sprintf("finance_report_%s_%s.xlsx", period, time.Now().Format("20060102"))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
	}
}

func (h *FinanceHandler) ExportFeesReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	period := c.Query("period")
	term := c.Query("term")
	year := c.Query("year")

	payments, fees, reportTitle, err := h.service.GetFeesExportData(schoolID, period, term, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get export data"})
		return
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
		studentName, className, guardianName, guardianPhone := h.service.GetPaymentStudentInfo(payment)

		f.SetCellValue("Payments", fmt.Sprintf("A%d", row), payment.PaymentDate.Format("2006-01-02"))
		f.SetCellValue("Payments", fmt.Sprintf("B%d", row), studentName)
		f.SetCellValue("Payments", fmt.Sprintf("C%d", row), className)
		f.SetCellValue("Payments", fmt.Sprintf("D%d", row), guardianName)
		f.SetCellValue("Payments", fmt.Sprintf("E%d", row), guardianPhone)

		if payment.StudentFees != nil {
			f.SetCellValue("Payments", fmt.Sprintf("F%d", row), payment.StudentFees.TotalFees)
			f.SetCellValue("Payments", fmt.Sprintf("G%d", row), payment.StudentFees.AmountPaid)
			f.SetCellValue("Payments", fmt.Sprintf("H%d", row), payment.StudentFees.Outstanding)
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

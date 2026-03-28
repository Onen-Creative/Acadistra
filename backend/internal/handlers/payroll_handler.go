package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type PayrollHandler struct {
	service      *services.PayrollService
	emailService *services.EmailService
}

func NewPayrollHandler(service *services.PayrollService, emailService *services.EmailService) *PayrollHandler {
	return &PayrollHandler{
		service:      service,
		emailService: emailService,
	}
}

// POST /api/payroll/salary-structures
func (h *PayrollHandler) CreateSalaryStructure(c *gin.Context) {
	var reqData struct {
		StaffID            *string `json:"staff_id"`
		UserID             *string `json:"user_id"`
		EmployeeName       string  `json:"employee_name"`
		EmployeeRole       string  `json:"employee_role"`
		EmployeeID         string  `json:"employee_id"`
		BaseSalary         float64 `json:"base_salary"`
		HousingAllowance   float64 `json:"housing_allowance"`
		TransportAllowance float64 `json:"transport_allowance"`
		MedicalAllowance   float64 `json:"medical_allowance"`
		LunchAllowance     float64 `json:"lunch_allowance"`
		OvertimeAllowance  float64 `json:"overtime_allowance"`
		PerformanceBonus   float64 `json:"performance_bonus"`
		OtherAllowances    float64 `json:"other_allowances"`
		NSSFDeduction      float64 `json:"nssf_deduction"`
		PAYEDeduction      float64 `json:"paye_deduction"`
		LoanDeduction      float64 `json:"loan_deduction"`
		InsuranceDeduction float64 `json:"insurance_deduction"`
		UnionDeduction     float64 `json:"union_deduction"`
		OtherDeductions    float64 `json:"other_deductions"`
	}

	if err := c.ShouldBindJSON(&reqData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")

	req := models.SalaryStructure{
		SchoolID:           schoolID,
		StaffID:            reqData.StaffID,
		UserID:             reqData.UserID,
		EmployeeName:       reqData.EmployeeName,
		EmployeeRole:       reqData.EmployeeRole,
		EmployeeID:         reqData.EmployeeID,
		BaseSalary:         reqData.BaseSalary,
		HousingAllowance:   reqData.HousingAllowance,
		TransportAllowance: reqData.TransportAllowance,
		MedicalAllowance:   reqData.MedicalAllowance,
		LunchAllowance:     reqData.LunchAllowance,
		OvertimeAllowance:  reqData.OvertimeAllowance,
		PerformanceBonus:   reqData.PerformanceBonus,
		OtherAllowances:    reqData.OtherAllowances,
		NSSFDeduction:      reqData.NSSFDeduction,
		PAYEDeduction:      reqData.PAYEDeduction,
		LoanDeduction:      reqData.LoanDeduction,
		InsuranceDeduction: reqData.InsuranceDeduction,
		UnionDeduction:     reqData.UnionDeduction,
		OtherDeductions:    reqData.OtherDeductions,
		EffectiveFrom:      time.Now(),
		Status:             "active",
	}

	// If user_id is provided but employee_name is empty, fetch from user
	if req.UserID != nil && req.EmployeeName == "" {
		var user models.User
		if err := h.service.GetDB().Where("id = ?", *req.UserID).First(&user).Error; err == nil {
			req.EmployeeName = user.FullName
			req.EmployeeRole = user.Role
		}
	}

	if err := h.service.CreateSalaryStructure(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

// PUT /api/payroll/salary-structures/:id
func (h *PayrollHandler) UpdateSalaryStructure(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	
	var req models.SalaryStructure
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateSalaryStructure(uint(id), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Salary structure updated"})
}

// DELETE /api/payroll/salary-structures/:id
func (h *PayrollHandler) DeleteSalaryStructure(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	
	if err := h.service.DeleteSalaryStructure(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Salary structure deleted"})
}

// GET /api/payroll/salary-structures
func (h *PayrollHandler) ListSalaryStructures(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	
	salaries, err := h.service.ListSalaryStructures(schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, salaries)
}

// GET /api/payroll/salary-structures/user/:user_id
func (h *PayrollHandler) GetSalaryStructure(c *gin.Context) {
	userID := c.Param("user_id")
	
	salary, err := h.service.GetSalaryStructure(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Salary structure not found"})
		return
	}

	c.JSON(http.StatusOK, salary)
}

// POST /api/payroll/process
func (h *PayrollHandler) ProcessPayroll(c *gin.Context) {
	var req struct {
		Month int `json:"month" binding:"required,min=1,max=12"`
		Year  int `json:"year" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")
	userIDStr := c.GetString("user_id")
	userID, _ := strconv.ParseUint(userIDStr, 10, 32)

	payroll, err := h.service.ProcessPayroll(schoolID, req.Month, req.Year, uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, payroll)
}

// GET /api/payroll/runs
func (h *PayrollHandler) ListPayrollRuns(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	
	payrolls, err := h.service.ListPayrollRuns(schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, payrolls)
}

// GET /api/payroll/runs/:id
func (h *PayrollHandler) GetPayrollRun(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	schoolID := c.GetString("tenant_school_id")
	
	payroll, err := h.service.GetPayrollRun(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payroll run not found"})
		return
	}
	
	// Validate school ownership
	if payroll.SchoolID != schoolID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, payroll)
}

// POST /api/payroll/payments/:id/mark-paid
func (h *PayrollHandler) MarkPaymentPaid(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	userID := c.GetString("user_id")
	
	var req struct {
		Method string `json:"method" binding:"required"`
		Ref    string `json:"ref"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.MarkPaymentPaid(uint(id), req.Method, req.Ref, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// Send payroll notification email
	go func(paymentID uint) {
		payment, err := h.service.GetPayslip(paymentID)
		if err == nil && payment.User != nil && payment.User.Email != "" {
			monthName := time.Month(payment.PayrollRun.Month).String()
			if err := h.emailService.SendPayrollNotification(
				payment.User.Email,
				payment.User.FullName,
				monthName,
				fmt.Sprintf("%d", payment.PayrollRun.Year),
				fmt.Sprintf("%.2f", payment.NetSalary),
			); err != nil {
				log.Printf("Failed to send payroll notification: %v", err)
			}
		}
	}(uint(id))

	c.JSON(http.StatusOK, gin.H{"message": "Payment marked as paid and expenditure recorded"})
}

// GET /api/payroll/payslip/:payment_id
func (h *PayrollHandler) GetPayslip(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("payment_id"), 10, 32)
	
	payment, err := h.service.GetPayslip(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}

	c.JSON(http.StatusOK, payment)
}

// GET /api/payroll/summary/:year
func (h *PayrollHandler) GetPayrollSummary(c *gin.Context) {
	year, _ := strconv.Atoi(c.Param("year"))
	schoolID := c.GetString("tenant_school_id")
	
	summary, err := h.service.GetPayrollSummary(schoolID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

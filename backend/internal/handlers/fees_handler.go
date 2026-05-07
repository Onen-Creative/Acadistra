package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"github.com/school-system/backend/internal/utils"
)

type FeesHandler struct {
	feesService *services.FeesService
}

func NewFeesHandler(feesService *services.FeesService) *FeesHandler {
	return &FeesHandler{
		feesService: feesService,
	}
}

func (h *FeesHandler) ListStudentFees(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	yearStr := c.Query("year")
	search := c.Query("search")
	classID := c.Query("class_id")
	page := utils.Atoi(c.DefaultQuery("page", "1"))
	limit := utils.Atoi(c.DefaultQuery("limit", "10"))

	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	fees, total, err := h.feesService.ListStudentFees(schoolID, term, yearStr, classID, search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"fees":  fees,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *FeesHandler) CreateOrUpdateStudentFees(c *gin.Context) {
	var req struct {
		StudentID    string             `json:"student_id" binding:"required"`
		Term         string             `json:"term" binding:"required"`
		Year         int                `json:"year" binding:"required"`
		TotalFees    float64            `json:"total_fees" binding:"required"`
		FeeBreakdown map[string]float64 `json:"fee_breakdown"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	schoolID := c.GetString("tenant_school_id")

	feeBreakdown := models.JSONB{}
	if req.FeeBreakdown != nil {
		for k, v := range req.FeeBreakdown {
			feeBreakdown[k] = v
		}
	}

	fees := &models.StudentFees{
		StudentID:    studentID,
		SchoolID:     uuid.MustParse(schoolID),
		Term:         req.Term,
		Year:         req.Year,
		TotalFees:    req.TotalFees,
		FeeBreakdown: feeBreakdown,
	}

	if err := h.feesService.CreateOrUpdateStudentFees(fees, schoolID); err != nil {
		if err.Error() == "student not found" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, fees)
}

func (h *FeesHandler) UpdateStudentFees(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		TotalFees    float64            `json:"total_fees" binding:"required"`
		FeeBreakdown map[string]float64 `json:"fee_breakdown"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	feeBreakdown := models.JSONB{}
	if req.FeeBreakdown != nil {
		for k, v := range req.FeeBreakdown {
			feeBreakdown[k] = v
		}
	}

	fees, err := h.feesService.UpdateFeesRecord(id, schoolID, req.TotalFees, feeBreakdown)
	if err != nil {
		if err.Error() == "fees record not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, fees)
}

func (h *FeesHandler) RecordPayment(c *gin.Context) {
	var req struct {
		StudentFeesID    string             `json:"student_fees_id" binding:"required"`
		Amount           float64            `json:"amount" binding:"required,gt=0"`
		PaymentMethod    string             `json:"payment_method"`
		ReceiptNo        string             `json:"receipt_no"`
		Notes            string             `json:"notes"`
		PaymentBreakdown map[string]float64 `json:"payment_breakdown"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed: " + err.Error()})
		return
	}

	studentFeesID, err := uuid.Parse(req.StudentFeesID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student fees ID"})
		return
	}

	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID not found"})
		return
	}

	var userID uuid.UUID
	switch v := userIDInterface.(type) {
	case uuid.UUID:
		userID = v
	case string:
		parsedID, err := uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
			return
		}
		userID = parsedID
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID type"})
		return
	}

	paymentBreakdown := models.JSONB{}
	if req.PaymentBreakdown != nil {
		for k, v := range req.PaymentBreakdown {
			paymentBreakdown[k] = v
		}
	}

	payment, updatedFees, err := h.feesService.RecordPaymentWithIncome(
		studentFeesID,
		req.Amount,
		req.PaymentMethod,
		req.ReceiptNo,
		req.Notes,
		userID,
		paymentBreakdown,
	)

	if err != nil {
		if err.Error() == "student fees record not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"payment": payment, "updated_fees": updatedFees, "income_created": true})
}

func (h *FeesHandler) GetStudentFeesDetails(c *gin.Context) {
	studentFeesID := c.Param("id")

	fees, payments, err := h.feesService.GetFeesDetailsWithPayments(studentFeesID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"fees":     fees,
		"payments": payments,
	})
}

func (h *FeesHandler) DeleteStudentFees(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.feesService.DeleteStudentFees(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student fees record deleted"})
}

func (h *FeesHandler) GetReportData(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	level := c.Query("level")
	classID := c.Query("class_id")

	reportData, err := h.feesService.GetFeesReport(schoolID, term, year, level, classID)
	if err != nil {
		if err.Error() == "invalid report type" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, reportData)
}

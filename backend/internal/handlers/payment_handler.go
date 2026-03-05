package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	db                 *gorm.DB
	mobileMoneyService *services.MobileMoneyService
	notificationService *services.NotificationService
}

func NewPaymentHandler(db *gorm.DB, mms *services.MobileMoneyService, ns *services.NotificationService) *PaymentHandler {
	return &PaymentHandler{
		db:                 db,
		mobileMoneyService: mms,
		notificationService: ns,
	}
}

// InitiateMobileMoneyPayment initiates a mobile money payment
func (h *PaymentHandler) InitiateMobileMoneyPayment(c *gin.Context) {
	var req struct {
		StudentFeesID string  `json:"student_fees_id" binding:"required"`
		Amount        float64 `json:"amount" binding:"required,gt=0"`
		PhoneNumber   string  `json:"phone_number" binding:"required"`
		Network       string  `json:"network" binding:"required,oneof=MTN AIRTEL"`
		Email         string  `json:"email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")

	// Validate phone number
	if !h.mobileMoneyService.ValidatePhoneNumber(req.PhoneNumber) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid phone number format"})
		return
	}

	// Normalize phone number
	req.PhoneNumber = h.mobileMoneyService.NormalizePhoneNumber(req.PhoneNumber)

	// Get student fees record
	var fees models.StudentFees
	if err := h.db.Where("id = ? AND school_id = ?", req.StudentFeesID, schoolID).First(&fees).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fees record not found"})
		return
	}

	// Validate amount
	if req.Amount > fees.Outstanding {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount exceeds outstanding balance"})
		return
	}

	// Get student details
	var student models.Student
	if err := h.db.First(&student, fees.StudentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	// Generate unique transaction reference
	txRef := fmt.Sprintf("FEES_%s_%d", fees.ID.String()[:8], time.Now().Unix())

	// Initiate mobile money payment
	paymentReq := services.InitiatePaymentRequest{
		Amount:      req.Amount,
		Currency:    "UGX",
		PhoneNumber: req.PhoneNumber,
		Email:       req.Email,
		TxRef:       txRef,
		Network:     req.Network,
		FullName:    fmt.Sprintf("%s %s", student.FirstName, student.LastName),
		RedirectURL: fmt.Sprintf("https://yourschool.com/payment/callback?ref=%s", txRef),
		Meta: map[string]interface{}{
			"student_id":      student.ID.String(),
			"student_fees_id": fees.ID.String(),
			"term":            fees.Term,
			"year":            fees.Year,
		},
	}

	response, err := h.mobileMoneyService.InitiateMobileMoneyPayment(uuid.MustParse(schoolID), paymentReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initiate payment: " + err.Error()})
		return
	}

	// Create payment record
	payment := models.MobileMoneyPayment{
		StudentFeesID:  fees.ID,
		SchoolID:       uuid.MustParse(schoolID),
		Amount:         req.Amount,
		PhoneNumber:    req.PhoneNumber,
		Provider:       req.Network,
		TransactionRef: txRef,
		ExternalRef:    response.Data.TransactionID,
		Status:         "pending",
		InitiatedAt:    time.Now(),
	}

	if err := h.db.Create(&payment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Payment initiated successfully",
		"payment_link":   response.Data.Link,
		"transaction_id": response.Data.TransactionID,
		"payment_id":     payment.ID,
		"tx_ref":         txRef,
	})
}

// VerifyPayment verifies a mobile money payment
func (h *PaymentHandler) VerifyPayment(c *gin.Context) {
	paymentID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var payment models.MobileMoneyPayment
	if err := h.db.Where("id = ? AND school_id = ?", paymentID, schoolID).First(&payment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}

	// Verify with Flutterwave
	result, err := h.mobileMoneyService.VerifyTransaction(payment.SchoolID, payment.ExternalRef)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Verification failed: " + err.Error()})
		return
	}

	// Update payment status
	payment.Status = result.Data.Status
	switch result.Data.Status {
	case "successful":
		now := time.Now()
		payment.CompletedAt = &now
		h.db.Save(&payment)

		// Update student fees
		var fees models.StudentFees
		h.db.First(&fees, payment.StudentFeesID)
		fees.AmountPaid += payment.Amount
		fees.Outstanding = fees.TotalFees - fees.AmountPaid
		h.db.Save(&fees)

		// Create fees payment record
		feesPayment := models.FeesPayment{
			StudentFeesID:  fees.ID,
			Amount:         payment.Amount,
			PaymentMethod:  "Mobile Money - " + payment.Provider,
			PaymentDate:    time.Now(),
			RecordedBy:     payment.SchoolID,
		}
		h.db.Create(&feesPayment)

		// Get student and guardian info
		var student models.Student
		h.db.First(&student, fees.StudentID)

		var guardian models.Guardian
		h.db.Where("student_id = ?", student.ID).First(&guardian)

		studentName := fmt.Sprintf("%s %s", student.FirstName, student.LastName)

		// Create finance income record
		income := models.Income{
			SchoolID:    payment.SchoolID,
			Category:    "School Fees",
			Source:      fmt.Sprintf("Mobile Money - %s", payment.Provider),
			Amount:      payment.Amount,
			Description: fmt.Sprintf("Fees payment for %s (Term %s %d) via %s", studentName, fees.Term, fees.Year, payment.Provider),
			Date:        time.Now(),
			Term:        fees.Term,
			Year:        fees.Year,
			ReceiptNo:   payment.TransactionRef,
			ReceivedBy:  payment.SchoolID,
		}
		h.db.Create(&income)

		// Send notifications
		h.notificationService.SendPaymentConfirmation(guardian.ID, payment.SchoolID, studentName, payment.Amount, fees.Outstanding)

		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "Payment verified and confirmed",
			"payment": payment,
			"fees":    fees,
		})
	case "failed":
		payment.ErrorMessage = "Payment failed"
		h.db.Save(&payment)
		c.JSON(http.StatusOK, gin.H{
			"status":  "failed",
			"message": "Payment verification failed",
		})
	default:
		c.JSON(http.StatusOK, gin.H{
			"status":  payment.Status,
			"message": "Payment is " + payment.Status,
		})
	}
}

// WebhookCallback handles payment webhook callbacks from Flutterwave
func (h *PaymentHandler) WebhookCallback(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	// Log webhook
	webhookLog := models.PaymentWebhookLog{
		Provider: "flutterwave",
		Payload:  models.JSONB(payload),
	}

	if event, ok := payload["event"].(string); ok {
		webhookLog.Event = event
	}

	h.db.Create(&webhookLog)

	// Validate webhook signature
	signature := c.GetHeader("verif-hash")
	if signature == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing signature"})
		return
	}

	// Process webhook based on event type
	event, ok := payload["event"].(string)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing event type"})
		return
	}

	if event == "charge.completed" {
		data, ok := payload["data"].(map[string]interface{})
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data"})
			return
		}

		txRef, _ := data["tx_ref"].(string)
		status, _ := data["status"].(string)

		webhookLog.TransactionRef = txRef

		// Find payment by transaction reference
		var payment models.MobileMoneyPayment
		if err := h.db.Where("transaction_ref = ?", txRef).First(&payment).Error; err != nil {
			webhookLog.ErrorMessage = "Payment not found"
			h.db.Save(&webhookLog)
			c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
			return
		}

		// Update payment status
		payment.Status = status

		if status == "successful" {
			now := time.Now()
			payment.CompletedAt = &now

			// Update student fees
			var fees models.StudentFees
			h.db.First(&fees, payment.StudentFeesID)
			fees.AmountPaid += payment.Amount
			fees.Outstanding = fees.TotalFees - fees.AmountPaid
			h.db.Save(&fees)

			// Create fees payment record
			feesPayment := models.FeesPayment{
				StudentFeesID:  fees.ID,
				Amount:         payment.Amount,
				PaymentMethod:  "Mobile Money - " + payment.Provider,
				PaymentDate:    time.Now(),
				RecordedBy:     payment.SchoolID,
			}
			h.db.Create(&feesPayment)

			// Get student info
			var student models.Student
			h.db.First(&student, fees.StudentID)

			var guardian models.Guardian
			h.db.Where("student_id = ?", student.ID).First(&guardian)

			studentName := fmt.Sprintf("%s %s", student.FirstName, student.LastName)

			// Create finance income record
			income := models.Income{
				SchoolID:    payment.SchoolID,
				Category:    "School Fees",
				Source:      fmt.Sprintf("Mobile Money - %s", payment.Provider),
				Amount:      payment.Amount,
				Description: fmt.Sprintf("Fees payment for %s (Term %s %d) via %s", studentName, fees.Term, fees.Year, payment.Provider),
				Date:        time.Now(),
				Term:        fees.Term,
				Year:        fees.Year,
				ReceiptNo:   payment.TransactionRef,
				ReceivedBy:  payment.SchoolID,
			}
			h.db.Create(&income)

			// Send notifications
			h.notificationService.SendPaymentConfirmation(guardian.ID, payment.SchoolID, studentName, payment.Amount, fees.Outstanding)
		}

		h.db.Save(&payment)
		webhookLog.Processed = true
		now := time.Now()
		webhookLog.ProcessedAt = &now
		h.db.Save(&webhookLog)
	}

	c.JSON(http.StatusOK, gin.H{"status": "received"})
}

// GetPaymentHistory returns payment history for a student
func (h *PaymentHandler) GetPaymentHistory(c *gin.Context) {
	studentID := c.Param("student_id")
	schoolID := c.GetString("tenant_school_id")

	var payments []models.MobileMoneyPayment
	if err := h.db.Where("student_id = ? AND school_id = ?", studentID, schoolID).
		Order("created_at DESC").
		Find(&payments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"payments": payments})
}

// GetPaymentStats returns payment statistics
func (h *PaymentHandler) GetPaymentStats(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	var stats struct {
		TotalPayments    int64   `json:"total_payments"`
		SuccessfulCount  int64   `json:"successful_count"`
		PendingCount     int64   `json:"pending_count"`
		FailedCount      int64   `json:"failed_count"`
		TotalAmount      float64 `json:"total_amount"`
		SuccessfulAmount float64 `json:"successful_amount"`
	}

	h.db.Model(&models.MobileMoneyPayment{}).
		Where("school_id = ?", schoolID).
		Count(&stats.TotalPayments)

	h.db.Model(&models.MobileMoneyPayment{}).
		Where("school_id = ? AND status = 'successful'", schoolID).
		Count(&stats.SuccessfulCount)

	h.db.Model(&models.MobileMoneyPayment{}).
		Where("school_id = ? AND status = 'pending'", schoolID).
		Count(&stats.PendingCount)

	h.db.Model(&models.MobileMoneyPayment{}).
		Where("school_id = ? AND status = 'failed'", schoolID).
		Count(&stats.FailedCount)

	h.db.Model(&models.MobileMoneyPayment{}).
		Select("COALESCE(SUM(amount), 0)").
		Where("school_id = ?", schoolID).
		Scan(&stats.TotalAmount)

	h.db.Model(&models.MobileMoneyPayment{}).
		Select("COALESCE(SUM(amount), 0)").
		Where("school_id = ? AND status = 'successful'", schoolID).
		Scan(&stats.SuccessfulAmount)

	c.JSON(http.StatusOK, stats)
}

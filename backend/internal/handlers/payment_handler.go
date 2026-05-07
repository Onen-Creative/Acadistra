package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/services"
)

type PaymentHandler struct {
	mobileMoneyService  *services.MobileMoneyService
	notificationService *services.NotificationService
	paymentService      *services.PaymentService
}

func NewPaymentHandler(mms *services.MobileMoneyService, ns *services.NotificationService, ps *services.PaymentService) *PaymentHandler {
	return &PaymentHandler{
		mobileMoneyService:  mms,
		notificationService: ns,
		paymentService:      ps,
	}
}

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

	// Validate and normalize phone
	if !h.mobileMoneyService.ValidatePhoneNumber(req.PhoneNumber) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid phone number format"})
		return
	}
	req.PhoneNumber = h.mobileMoneyService.NormalizePhoneNumber(req.PhoneNumber)

	// Initiate payment
	payment, paymentReq, err := h.paymentService.InitiatePayment(schoolID, req.StudentFeesID, req.Amount, req.PhoneNumber, req.Network, req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Call mobile money service
	response, err := h.mobileMoneyService.InitiateMobileMoneyPayment(uuid.MustParse(schoolID), *paymentReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initiate payment: " + err.Error()})
		return
	}

	// Save payment record
	payment.ExternalRef = response.Data.TransactionID
	if err := h.paymentService.CreatePayment(payment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Payment initiated successfully",
		"payment_link":   response.Data.Link,
		"transaction_id": response.Data.TransactionID,
		"payment_id":     payment.ID,
		"tx_ref":         payment.TransactionRef,
	})
}

func (h *PaymentHandler) VerifyPayment(c *gin.Context) {
	paymentID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	payment, err := h.paymentService.GetPaymentByIDWithDetails(paymentID, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}

	// Verify with provider
	result, err := h.mobileMoneyService.VerifyTransaction(payment.SchoolID, payment.ExternalRef)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Verification failed: " + err.Error()})
		return
	}

	// Update status
	payment.Status = result.Data.Status
	switch result.Data.Status {
	case "successful":
		if err := h.paymentService.ProcessSuccessfulPayment(payment); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process payment"})
			return
		}

		// Get updated fees and send notification
		fees, _ := h.paymentService.GetStudentFees(payment.StudentFeesID.String(), schoolID)
		student, _ := h.paymentService.GetStudent(fees.StudentID)
		guardian, _ := h.paymentService.GetGuardianByStudent(student.ID)
		h.notificationService.SendPaymentConfirmation(guardian.ID, payment.SchoolID, student.FirstName+" "+student.LastName, payment.Amount, fees.Outstanding)

		c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Payment verified and confirmed", "payment": payment, "fees": fees})
	case "failed":
		payment.ErrorMessage = "Payment failed"
		h.paymentService.UpdatePaymentStatus(payment)
		c.JSON(http.StatusOK, gin.H{"status": "failed", "message": "Payment verification failed"})
	default:
		c.JSON(http.StatusOK, gin.H{"status": payment.Status, "message": "Payment is " + payment.Status})
	}
}

func (h *PaymentHandler) WebhookCallback(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	event, _ := payload["event"].(string)
	webhookLog, _ := h.paymentService.LogWebhook("flutterwave", event, "", "", payload)

	// Validate signature
	if c.GetHeader("verif-hash") == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing signature"})
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

		payment, err := h.paymentService.GetPaymentByTxRef(txRef)
		if err != nil {
			webhookLog.ErrorMessage = "Payment not found"
			h.paymentService.UpdatePaymentStatus(payment)
			c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
			return
		}

		payment.Status = status
		if status == "successful" {
			h.paymentService.ProcessSuccessfulPayment(payment)
			
			// Send notification
			fees, _ := h.paymentService.GetStudentFees(payment.StudentFeesID.String(), payment.SchoolID.String())
			student, _ := h.paymentService.GetStudent(fees.StudentID)
			guardian, _ := h.paymentService.GetGuardianByStudent(student.ID)
			h.notificationService.SendPaymentConfirmation(guardian.ID, payment.SchoolID, student.FirstName+" "+student.LastName, payment.Amount, fees.Outstanding)
		} else {
			h.paymentService.UpdatePaymentStatus(payment)
		}

		h.paymentService.MarkWebhookProcessed(webhookLog)
	}

	c.JSON(http.StatusOK, gin.H{"status": "received"})
}

func (h *PaymentHandler) GetPaymentHistory(c *gin.Context) {
	studentID := c.Param("student_id")
	schoolID := c.GetString("tenant_school_id")

	payments, err := h.paymentService.GetPaymentHistory(studentID, schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"payments": payments})
}

func (h *PaymentHandler) GetPaymentStats(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	stats, err := h.paymentService.GetPaymentStats(schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

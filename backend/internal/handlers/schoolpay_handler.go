package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
)

type SchoolPayHandler struct {
	service *services.SchoolPayService
}

func NewSchoolPayHandler(service *services.SchoolPayService) *SchoolPayHandler {
	return &SchoolPayHandler{service: service}
}

// HandleWebhook processes SchoolPay webhook notifications
func (h *SchoolPayHandler) HandleWebhook(c *gin.Context) {
	schoolIDStr := c.Param("school_id")
	schoolID, err := uuid.Parse(schoolIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid school ID"})
		return
	}

	var payload services.SchoolPayWebhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if err := h.service.ProcessWebhook(schoolID, payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
}

// SyncTransactions manually syncs transactions for a date range
func (h *SchoolPayHandler) SyncTransactions(c *gin.Context) {
	schoolID, exists := c.Get("school_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	var req struct {
		FromDate string `json:"from_date" binding:"required"`
		ToDate   string `json:"to_date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fromDate, err := time.Parse("2006-01-02", req.FromDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid from_date format (YYYY-MM-DD)"})
		return
	}

	var toDate time.Time
	if req.ToDate != "" {
		toDate, err = time.Parse("2006-01-02", req.ToDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid to_date format (YYYY-MM-DD)"})
			return
		}

		if err := h.service.SyncTransactionsForRange(schoolID.(uuid.UUID), fromDate, toDate); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else {
		if err := h.service.SyncTransactionsForDate(schoolID.(uuid.UUID), fromDate); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transactions synced successfully"})
}

// ProcessTransactions processes unprocessed transactions
func (h *SchoolPayHandler) ProcessTransactions(c *gin.Context) {
	schoolID, exists := c.Get("school_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	if err := h.service.ProcessUnprocessedTransactions(schoolID.(uuid.UUID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transactions processed successfully"})
}

// GetTransactions retrieves SchoolPay transactions
func (h *SchoolPayHandler) GetTransactions(c *gin.Context) {
	schoolID, exists := c.Get("school_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	var transactions []models.SchoolPayTransaction
	query := h.service.DB().Where("school_id = ?", schoolID)

	// Filters
	if status := c.Query("processed"); status != "" {
		query = query.Where("processed = ?", status == "true")
	}
	if txnType := c.Query("type"); txnType != "" {
		query = query.Where("transaction_type = ?", txnType)
	}
	if fromDate := c.Query("from_date"); fromDate != "" {
		query = query.Where("payment_date_and_time >= ?", fromDate)
	}
	if toDate := c.Query("to_date"); toDate != "" {
		query = query.Where("payment_date_and_time <= ?", toDate)
	}

	if err := query.Order("payment_date_and_time DESC").Preload("Student").Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, transactions)
}

// GetConfig retrieves SchoolPay configuration
func (h *SchoolPayHandler) GetConfig(c *gin.Context) {
	schoolID, exists := c.Get("school_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	var config models.SchoolPayConfig
	if err := h.service.DB().Where("school_id = ?", schoolID).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Configuration not found"})
		return
	}

	c.JSON(http.StatusOK, config)
}

// UpdateConfig updates SchoolPay configuration
func (h *SchoolPayHandler) UpdateConfig(c *gin.Context) {
	schoolID, exists := c.Get("school_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	var req struct {
		SchoolCode     string `json:"school_code" binding:"required"`
		APIPassword    string `json:"api_password" binding:"required"`
		WebhookURL     string `json:"webhook_url"`
		WebhookEnabled bool   `json:"webhook_enabled"`
		IsActive       bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var config models.SchoolPayConfig
	if err := h.service.DB().Where("school_id = ?", schoolID).First(&config).Error; err != nil {
		// Create new config
		config = models.SchoolPayConfig{
			SchoolID:       schoolID.(uuid.UUID),
			SchoolCode:     req.SchoolCode,
			APIPassword:    req.APIPassword,
			WebhookURL:     req.WebhookURL,
			WebhookEnabled: req.WebhookEnabled,
			IsActive:       req.IsActive,
		}
		if err := h.service.DB().Create(&config).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else {
		// Update existing
		config.SchoolCode = req.SchoolCode
		config.APIPassword = req.APIPassword
		config.WebhookURL = req.WebhookURL
		config.WebhookEnabled = req.WebhookEnabled
		config.IsActive = req.IsActive
		if err := h.service.DB().Save(&config).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, config)
}

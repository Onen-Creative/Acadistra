package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/school-system/backend/internal/models"
)

type PaymentConfigHandler struct {
	db *gorm.DB
}

func NewPaymentConfigHandler(db *gorm.DB) *PaymentConfigHandler {
	return &PaymentConfigHandler{db: db}
}

type PaymentConfigRequest struct {
	Provider              string `json:"provider" binding:"required"`
	PublicKey             string `json:"public_key" binding:"required"`
	SecretKey             string `json:"secret_key" binding:"required"`
	EncryptionKey         string `json:"encryption_key" binding:"required"`
	WebhookSecret         string `json:"webhook_secret" binding:"required"`
	MerchantAccountNumber string `json:"merchant_account_number" binding:"required"`
	MerchantAccountName   string `json:"merchant_account_name" binding:"required"`
	MerchantBankName      string `json:"merchant_bank_name" binding:"required"`
}

// CreateOrUpdateConfig creates or updates payment configuration for a school
func (h *PaymentConfigHandler) CreateOrUpdateConfig(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	
	var req PaymentConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var config models.SchoolPaymentConfig
	err := h.db.Where("school_id = ?", schoolID).First(&config).Error

	if err == gorm.ErrRecordNotFound {
		// Create new config
		config = models.SchoolPaymentConfig{
			SchoolID:              uuid.MustParse(schoolID),
			Provider:              req.Provider,
			PublicKey:             req.PublicKey,
			SecretKey:             req.SecretKey,
			EncryptionKey:         req.EncryptionKey,
			WebhookSecret:         req.WebhookSecret,
			MerchantAccountNumber: req.MerchantAccountNumber,
			MerchantAccountName:   req.MerchantAccountName,
			MerchantBankName:      req.MerchantBankName,
			IsActive:              true,
		}
		if err := h.db.Create(&config).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create config"})
			return
		}
	} else {
		// Update existing config
		config.Provider = req.Provider
		config.PublicKey = req.PublicKey
		config.SecretKey = req.SecretKey
		config.EncryptionKey = req.EncryptionKey
		config.WebhookSecret = req.WebhookSecret
		config.MerchantAccountNumber = req.MerchantAccountNumber
		config.MerchantAccountName = req.MerchantAccountName
		config.MerchantBankName = req.MerchantBankName
		config.IsActive = true
		h.db.Save(&config)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Payment configuration saved successfully",
		"config": gin.H{
			"provider":                req.Provider,
			"merchant_account_number": req.MerchantAccountNumber,
			"merchant_account_name":   req.MerchantAccountName,
			"merchant_bank_name":      req.MerchantBankName,
			"is_active":               config.IsActive,
		},
	})
}

// GetConfig retrieves payment configuration for a school
func (h *PaymentConfigHandler) GetConfig(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	var config models.SchoolPaymentConfig
	if err := h.db.Where("school_id = ?", schoolID).First(&config).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Payment configuration not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"provider":                config.Provider,
		"public_key":              config.PublicKey,
		"merchant_account_number": config.MerchantAccountNumber,
		"merchant_account_name":   config.MerchantAccountName,
		"merchant_bank_name":      config.MerchantBankName,
		"is_active":               config.IsActive,
	})
}

// ToggleConfig activates or deactivates payment configuration
func (h *PaymentConfigHandler) ToggleConfig(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	var config models.SchoolPaymentConfig
	if err := h.db.Where("school_id = ?", schoolID).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment configuration not found"})
		return
	}

	config.IsActive = !config.IsActive
	h.db.Save(&config)

	c.JSON(http.StatusOK, gin.H{
		"message":   "Payment configuration updated",
		"is_active": config.IsActive,
	})
}

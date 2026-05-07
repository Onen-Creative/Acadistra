package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type PaymentConfigHandler struct {
	service *services.PaymentConfigService
}

func NewPaymentConfigHandler(service *services.PaymentConfigService) *PaymentConfigHandler {
	return &PaymentConfigHandler{service: service}
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

func (h *PaymentConfigHandler) CreateOrUpdateConfig(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	
	var req PaymentConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	svcReq := &services.PaymentConfigRequest{
		Provider:              req.Provider,
		PublicKey:             req.PublicKey,
		SecretKey:             req.SecretKey,
		EncryptionKey:         req.EncryptionKey,
		WebhookSecret:         req.WebhookSecret,
		MerchantAccountNumber: req.MerchantAccountNumber,
		MerchantAccountName:   req.MerchantAccountName,
		MerchantBankName:      req.MerchantBankName,
	}

	config, err := h.service.CreateOrUpdate(schoolID, svcReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Payment configuration saved successfully",
		"config": gin.H{
			"provider":                config.Provider,
			"merchant_account_number": config.MerchantAccountNumber,
			"merchant_account_name":   config.MerchantAccountName,
			"merchant_bank_name":      config.MerchantBankName,
			"is_active":               config.IsActive,
		},
	})
}

func (h *PaymentConfigHandler) GetConfig(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	config, err := h.service.GetConfig(schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment configuration not found"})
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

func (h *PaymentConfigHandler) ToggleConfig(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	config, err := h.service.ToggleConfig(schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment configuration not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Payment configuration updated",
		"is_active": config.IsActive,
	})
}

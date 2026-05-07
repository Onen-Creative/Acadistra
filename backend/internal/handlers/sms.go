package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services/sms"
	"gorm.io/gorm"
)

type SMSHandler struct {
	db         *gorm.DB
	smsService *sms.Service
}

func NewSMSHandler(db *gorm.DB) *SMSHandler {
	return &SMSHandler{
		db:         db,
		smsService: sms.NewService(db),
	}
}

// SendSMS sends a single SMS
func (h *SMSHandler) SendSMS(c *gin.Context) {
	var req struct {
		RecipientID   *string    `json:"recipient_id"`
		RecipientType string     `json:"recipient_type"`
		PhoneNumber   string     `json:"phone_number" binding:"required"`
		Message       string     `json:"message" binding:"required"`
		Category      string     `json:"category" binding:"required"`
		Priority      int        `json:"priority"`
		ScheduledFor  *time.Time `json:"scheduled_for"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")

	var recipientID *uuid.UUID
	if req.RecipientID != nil {
		id, _ := uuid.Parse(*req.RecipientID)
		recipientID = &id
	}

	err := h.smsService.SendSMS(c.Request.Context(), sms.SendSMSRequest{
		SchoolID:      uuid.MustParse(schoolID),
		RecipientID:   recipientID,
		RecipientType: req.RecipientType,
		PhoneNumber:   req.PhoneNumber,
		Message:       req.Message,
		Category:      req.Category,
		Priority:      req.Priority,
		ScheduledFor:  req.ScheduledFor,
		CreatedBy:     uuid.MustParse(userID),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "SMS queued successfully"})
}

// SendBulkSMS sends SMS to multiple recipients
func (h *SMSHandler) SendBulkSMS(c *gin.Context) {
	var req struct {
		Name       string `json:"name" binding:"required"`
		Category   string `json:"category" binding:"required"`
		Message    string `json:"message"`
		TemplateID *string `json:"template_id"`
		Recipients []struct {
			RecipientID   *string                `json:"recipient_id"`
			RecipientType string                 `json:"recipient_type"`
			PhoneNumber   string                 `json:"phone_number" binding:"required"`
			Variables     map[string]interface{} `json:"variables"`
		} `json:"recipients" binding:"required"`
		Priority int `json:"priority"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")

	var templateID *uuid.UUID
	if req.TemplateID != nil {
		id, _ := uuid.Parse(*req.TemplateID)
		templateID = &id
	}

	recipients := make([]sms.SMSRecipient, len(req.Recipients))
	for i, r := range req.Recipients {
		var recipientID *uuid.UUID
		if r.RecipientID != nil {
			id, _ := uuid.Parse(*r.RecipientID)
			recipientID = &id
		}
		recipients[i] = sms.SMSRecipient{
			RecipientID:   recipientID,
			RecipientType: r.RecipientType,
			PhoneNumber:   r.PhoneNumber,
			Variables:     r.Variables,
		}
	}

	batch, err := h.smsService.SendBulkSMS(c.Request.Context(), sms.BulkSMSRequest{
		SchoolID:   uuid.MustParse(schoolID),
		Name:       req.Name,
		Category:   req.Category,
		Message:    req.Message,
		TemplateID: templateID,
		Recipients: recipients,
		Priority:   req.Priority,
		CreatedBy:  uuid.MustParse(userID),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, batch)
}

// GetSMSQueue lists SMS queue
func (h *SMSHandler) GetSMSQueue(c *gin.Context) {
	schoolID := c.GetString("school_id")
	status := c.Query("status")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))

	queue, err := h.smsService.GetQueue(uuid.MustParse(schoolID), status, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, queue)
}

// GetSMSBatches lists SMS batches
func (h *SMSHandler) GetSMSBatches(c *gin.Context) {
	schoolID := c.GetString("school_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	batches, err := h.smsService.GetBatches(uuid.MustParse(schoolID), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, batches)
}

// GetSMSLogs lists SMS logs
func (h *SMSHandler) GetSMSLogs(c *gin.Context) {
	schoolID := c.GetString("school_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))

	logs, err := h.smsService.GetLogs(uuid.MustParse(schoolID), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

// GetSMSStats gets SMS statistics
func (h *SMSHandler) GetSMSStats(c *gin.Context) {
	schoolID := c.GetString("school_id")

	stats, err := h.smsService.GetStats(uuid.MustParse(schoolID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// CreateTemplate creates an SMS template
func (h *SMSHandler) CreateTemplate(c *gin.Context) {
	var req struct {
		Name      string                 `json:"name" binding:"required"`
		Category  string                 `json:"category" binding:"required"`
		Template  string                 `json:"template" binding:"required"`
		Variables map[string]interface{} `json:"variables"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("school_id")
	sid, _ := uuid.Parse(schoolID)

	template := &models.SMSTemplate{
		SchoolID:  &sid,
		Name:      req.Name,
		Category:  req.Category,
		Template:  req.Template,
		Variables: req.Variables,
		IsActive:  true,
	}

	if err := h.smsService.CreateTemplate(template); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, template)
}

// GetTemplates lists SMS templates
func (h *SMSHandler) GetTemplates(c *gin.Context) {
	schoolID := c.GetString("school_id")
	sid, _ := uuid.Parse(schoolID)

	templates, err := h.smsService.GetTemplates(&sid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, templates)
}

// ConfigureProvider configures SMS provider
func (h *SMSHandler) ConfigureProvider(c *gin.Context) {
	var req struct {
		Provider  string `json:"provider" binding:"required"`
		APIKey    string `json:"api_key" binding:"required"`
		APISecret string `json:"api_secret"`
		Username  string `json:"username" binding:"required"`
		SenderID  string `json:"sender_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("school_id")

	provider := &models.SMSProvider{
		SchoolID:  uuid.MustParse(schoolID),
		Provider:  req.Provider,
		APIKey:    req.APIKey,
		APISecret: req.APISecret,
		Username:  req.Username,
		SenderID:  req.SenderID,
		IsActive:  true,
	}

	if err := h.smsService.ConfigureProvider(provider); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Provider configured successfully"})
}

// GetProvider gets SMS provider config
func (h *SMSHandler) GetProvider(c *gin.Context) {
	schoolID := c.GetString("school_id")

	provider, err := h.smsService.GetProvider(uuid.MustParse(schoolID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Provider not configured"})
		return
	}

	// Hide sensitive data
	provider.APIKey = ""
	provider.APISecret = ""

	c.JSON(http.StatusOK, provider)
}

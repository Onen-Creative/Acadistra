package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type EmailMonitorHandler struct {
	db           *gorm.DB
	emailService *services.EmailService
}

func NewEmailMonitorHandler(db *gorm.DB, emailService *services.EmailService) *EmailMonitorHandler {
	return &EmailMonitorHandler{
		db:           db,
		emailService: emailService,
	}
}

// GetEmailQueueStats returns email queue statistics
func (h *EmailMonitorHandler) GetEmailQueueStats(c *gin.Context) {
	stats, err := h.emailService.GetQueueStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ListQueuedEmails lists emails in queue with filters
func (h *EmailMonitorHandler) ListQueuedEmails(c *gin.Context) {
	status := c.DefaultQuery("status", "")
	emailType := c.DefaultQuery("email_type", "")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "50")

	var pageInt, limitInt int
	if _, err := fmt.Sscanf(page, "%d", &pageInt); err != nil {
		pageInt = 1
	}
	if _, err := fmt.Sscanf(limit, "%d", &limitInt); err != nil {
		limitInt = 50
	}

	query := h.db.Model(&models.EmailQueue{})

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if emailType != "" {
		query = query.Where("email_type = ?", emailType)
	}

	var total int64
	query.Count(&total)

	var emails []models.EmailQueue
	if err := query.Order("created_at DESC").
		Limit(limitInt).
		Offset((pageInt - 1) * limitInt).
		Find(&emails).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"emails": emails,
		"total":  total,
		"page":   pageInt,
		"limit":  limitInt,
	})
}

// RetryFailedEmail retries a failed email
func (h *EmailMonitorHandler) RetryFailedEmail(c *gin.Context) {
	id := c.Param("id")

	var email models.EmailQueue
	if err := h.db.First(&email, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Email not found"})
		return
	}

	if email.Status != "failed" && email.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only retry failed or pending emails"})
		return
	}

	// Reset for retry
	email.Status = "pending"
	email.Attempts = 0
	email.Error = ""
	now := time.Now()
	email.NextRetry = &now

	if err := h.db.Save(&email).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email queued for retry", "email": email})
}

// CancelQueuedEmail cancels a pending email
func (h *EmailMonitorHandler) CancelQueuedEmail(c *gin.Context) {
	id := c.Param("id")

	var email models.EmailQueue
	if err := h.db.First(&email, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Email not found"})
		return
	}

	if email.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only cancel pending emails"})
		return
	}

	email.Status = "cancelled"
	if err := h.db.Save(&email).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email cancelled", "email": email})
}

// GetEmailDetails gets details of a specific email
func (h *EmailMonitorHandler) GetEmailDetails(c *gin.Context) {
	id := c.Param("id")

	var email models.EmailQueue
	if err := h.db.First(&email, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Email not found"})
		return
	}

	c.JSON(http.StatusOK, email)
}

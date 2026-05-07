package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type EmailMonitorHandler struct {
	emailService *services.EmailService
}

func NewEmailMonitorHandler(emailService *services.EmailService) *EmailMonitorHandler {
	return &EmailMonitorHandler{
		emailService: emailService,
	}
}

func (h *EmailMonitorHandler) GetEmailQueueStats(c *gin.Context) {
	stats, err := h.emailService.GetQueueStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

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

	emails, total, err := h.emailService.ListQueuedEmails(status, emailType, pageInt, limitInt)
	if err != nil {
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

func (h *EmailMonitorHandler) RetryFailedEmail(c *gin.Context) {
	id := c.Param("id")

	email, err := h.emailService.RetryFailedEmail(id)
	if err != nil {
		if err.Error() == "Email not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if err.Error() == "Can only retry failed or pending emails" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email queued for retry", "email": email})
}

func (h *EmailMonitorHandler) CancelQueuedEmail(c *gin.Context) {
	id := c.Param("id")

	email, err := h.emailService.CancelQueuedEmail(id)
	if err != nil {
		if err.Error() == "Email not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if err.Error() == "Can only cancel pending emails" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email cancelled", "email": email})
}

func (h *EmailMonitorHandler) GetEmailDetails(c *gin.Context) {
	id := c.Param("id")

	email, err := h.emailService.GetEmailDetails(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Email not found"})
		return
	}

	c.JSON(http.StatusOK, email)
}

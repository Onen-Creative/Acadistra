package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type NotificationHandler struct {
	db *gorm.DB
}

func NewNotificationHandler(db *gorm.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	userID := c.GetString("user_id")
	schoolID := c.GetString("school_id")

	// Allow pagination with default limit of 50
	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsedLimit, err := strconv.Atoi(l); err == nil && parsedLimit > 0 {
			if parsedLimit > 500 {
				limit = 500 // Cap at 500
			} else {
				limit = parsedLimit
			}
		}
	}

	var notifications []models.Notification
	query := h.db.Where("user_id = ? OR school_id = ? OR (user_id IS NULL AND school_id IS NULL)", userID, schoolID).
		Order("created_at DESC").
		Limit(limit)

	if err := query.Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"notifications": notifications})
}

func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	userID := c.GetString("user_id")
	schoolID := c.GetString("school_id")

	var count int64
	h.db.Model(&models.Notification{}).
		Where("is_read = ? AND (user_id = ? OR school_id = ? OR (user_id IS NULL AND school_id IS NULL))", false, userID, schoolID).
		Count(&count)

	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	now := time.Now()
	result := h.db.Model(&models.Notification{}).
		Where("id = ? AND (user_id = ? OR user_id IS NULL)", id, userID).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Marked as read"})
}

func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userID := c.GetString("user_id")
	schoolID := c.GetString("school_id")

	now := time.Now()
	h.db.Model(&models.Notification{}).
		Where("is_read = ? AND (user_id = ? OR school_id = ? OR (user_id IS NULL AND school_id IS NULL))", false, userID, schoolID).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		})

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}

func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	result := h.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Notification{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification deleted"})
}

func (h *NotificationHandler) GetPreferences(c *gin.Context) {
	guardianID := c.GetString("user_id")
	schoolID := c.GetString("tenant_school_id")

	var prefs models.NotificationPreference
	err := h.db.Where("guardian_id = ? AND school_id = ?", guardianID, schoolID).First(&prefs).Error

	if err == gorm.ErrRecordNotFound {
		prefs = models.NotificationPreference{
			SMSEnabled:      true,
			EmailEnabled:    true,
			FeesReminders:   true,
			PaymentConfirm:  true,
			ResultsNotify:   true,
			AttendanceAlert: true,
			Announcements:   true,
			WeeklySummary:   false,
			MonthlySummary:  true,
		}
		c.JSON(http.StatusOK, prefs)
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch preferences"})
		return
	}

	c.JSON(http.StatusOK, prefs)
}

func (h *NotificationHandler) UpdatePreferences(c *gin.Context) {
	guardianID := c.GetString("user_id")
	schoolID := c.GetString("tenant_school_id")

	var req models.NotificationPreference
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var prefs models.NotificationPreference
	err := h.db.Where("guardian_id = ? AND school_id = ?", guardianID, schoolID).First(&prefs).Error

	if err == gorm.ErrRecordNotFound {
		prefs = req
		if err := h.db.Create(&prefs).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create preferences"})
			return
		}
	} else {
		prefs.SMSEnabled = req.SMSEnabled
		prefs.EmailEnabled = req.EmailEnabled
		prefs.FeesReminders = req.FeesReminders
		prefs.PaymentConfirm = req.PaymentConfirm
		prefs.ResultsNotify = req.ResultsNotify
		prefs.AttendanceAlert = req.AttendanceAlert
		prefs.Announcements = req.Announcements
		prefs.WeeklySummary = req.WeeklySummary
		prefs.MonthlySummary = req.MonthlySummary
		h.db.Save(&prefs)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Preferences updated", "preferences": prefs})
}

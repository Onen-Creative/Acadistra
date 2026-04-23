package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type UserNotificationHandler struct {
	db *gorm.DB
}

func NewUserNotificationHandler(db *gorm.DB) *UserNotificationHandler {
	return &UserNotificationHandler{db: db}
}

func (h *UserNotificationHandler) GetUserNotifications(c *gin.Context) {
	userID := c.GetString("user_id")

	var notifications []models.UserNotification
	if err := h.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(50).
		Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	if notifications == nil {
		notifications = []models.UserNotification{}
	}

	c.JSON(http.StatusOK, notifications)
}

func (h *UserNotificationHandler) MarkAsRead(c *gin.Context) {
	notificationID := c.Param("id")
	userID := c.GetString("user_id")

	var notification models.UserNotification
	if err := h.db.Where("id = ? AND user_id = ?", notificationID, userID).
		First(&notification).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	now := time.Now()
	notification.IsRead = true
	notification.ReadAt = &now

	if err := h.db.Save(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification"})
		return
	}

	c.JSON(http.StatusOK, notification)
}

func (h *UserNotificationHandler) GetUnreadCount(c *gin.Context) {
	userID := c.GetString("user_id")

	var count int64
	h.db.Model(&models.UserNotification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Count(&count)

	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}

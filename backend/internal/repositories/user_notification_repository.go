package repositories

import (
	"time"

	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type UserNotificationRepository struct {
	db *gorm.DB
}

func NewUserNotificationRepository(db *gorm.DB) *UserNotificationRepository {
	return &UserNotificationRepository{db: db}
}

func (r *UserNotificationRepository) GetByUserID(userID string, limit int) ([]models.UserNotification, error) {
	var notifications []models.UserNotification
	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&notifications).Error
	
	if notifications == nil {
		notifications = []models.UserNotification{}
	}
	
	return notifications, err
}

func (r *UserNotificationRepository) MarkAsRead(notificationID, userID string) (*models.UserNotification, error) {
	var notification models.UserNotification
	if err := r.db.Where("id = ? AND user_id = ?", notificationID, userID).
		First(&notification).Error; err != nil {
		return nil, err
	}

	now := time.Now()
	notification.IsRead = true
	notification.ReadAt = &now

	if err := r.db.Save(&notification).Error; err != nil {
		return nil, err
	}

	return &notification, nil
}

func (r *UserNotificationRepository) GetUnreadCount(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&models.UserNotification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Count(&count).Error
	return count, err
}

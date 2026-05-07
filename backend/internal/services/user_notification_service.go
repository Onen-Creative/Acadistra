package services

import (
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
)

type UserNotificationService struct {
	repo *repositories.UserNotificationRepository
}

func NewUserNotificationService(repo *repositories.UserNotificationRepository) *UserNotificationService {
	return &UserNotificationService{repo: repo}
}

func (s *UserNotificationService) GetUserNotifications(userID string) ([]models.UserNotification, error) {
	return s.repo.GetByUserID(userID, 50)
}

func (s *UserNotificationService) MarkAsRead(notificationID, userID string) (*models.UserNotification, error) {
	return s.repo.MarkAsRead(notificationID, userID)
}

func (s *UserNotificationService) GetUnreadCount(userID string) (int64, error) {
	return s.repo.GetUnreadCount(userID)
}

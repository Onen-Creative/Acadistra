package services

import (
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
)

type NotificationServiceRepo struct {
	repo repositories.NotificationRepository
}

func NewNotificationServiceRepo(repo repositories.NotificationRepository) *NotificationServiceRepo {
	return &NotificationServiceRepo{repo: repo}
}

func (s *NotificationServiceRepo) Create(notification *models.Notification) error {
	return s.repo.Create(notification)
}

func (s *NotificationServiceRepo) FindByUser(userID uint, limit int) ([]models.Notification, error) {
	return s.repo.FindByUser(userID, limit)
}

func (s *NotificationServiceRepo) FindUnreadByUser(userID uint) ([]models.Notification, error) {
	return s.repo.FindUnreadByUser(userID)
}

func (s *NotificationServiceRepo) MarkAsRead(id uint) error {
	return s.repo.MarkAsRead(id)
}

func (s *NotificationServiceRepo) MarkAllAsRead(userID uint) error {
	return s.repo.MarkAllAsRead(userID)
}

func (s *NotificationServiceRepo) DeleteOld(days int) error {
	return s.repo.DeleteOld(days)
}

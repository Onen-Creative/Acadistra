package services

import (
	"time"

	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
)

type AnnouncementService struct {
	repo         repositories.AnnouncementRepository
	emailService *EmailService
}

func NewAnnouncementService(repo repositories.AnnouncementRepository, emailService *EmailService) *AnnouncementService {
	return &AnnouncementService{
		repo:         repo,
		emailService: emailService,
	}
}

func (s *AnnouncementService) Create(announcement *models.SystemAnnouncement) error {
	return s.repo.Create(announcement)
}

func (s *AnnouncementService) Update(announcement *models.SystemAnnouncement) error {
	return s.repo.Update(announcement)
}

func (s *AnnouncementService) Delete(id string) error {
	return s.repo.Delete(id)
}

func (s *AnnouncementService) FindByID(id string) (*models.SystemAnnouncement, error) {
	return s.repo.FindByID(id)
}

func (s *AnnouncementService) FindByIDWithCreator(id string) (*models.SystemAnnouncement, error) {
	return s.repo.FindByIDWithCreator(id)
}

func (s *AnnouncementService) FindAll(schoolID, userRole string) ([]models.SystemAnnouncement, error) {
	return s.repo.FindAll(schoolID, userRole)
}

func (s *AnnouncementService) SendAnnouncement(announcement *models.SystemAnnouncement) (int, int, error) {
	var schoolIDStr *string
	if announcement.SchoolID != nil {
		str := announcement.SchoolID.String()
		schoolIDStr = &str
	}

	roles := announcement.TargetRoles["roles"].([]interface{})
	roleStrings := make([]string, len(roles))
	for i, r := range roles {
		roleStrings[i] = r.(string)
	}

	users, err := s.repo.FindTargetUsers(schoolIDStr, roleStrings)
	if err != nil {
		return 0, 0, err
	}

	totalSent := 0
	totalFailed := 0

	for _, user := range users {
		notification := models.UserNotification{
			UserID:         user.ID,
			AnnouncementID: &announcement.ID,
			Title:          announcement.Title,
			Message:        announcement.Message,
			Priority:       announcement.Priority,
			IsRead:         false,
		}
		s.repo.CreateNotification(&notification)

		if announcement.SendEmail && s.emailService != nil && user.Email != "" {
			err := s.emailService.SendSystemAnnouncement(user.Email, user.FullName, announcement.Title, announcement.Message, announcement.Priority)
			if err != nil {
				totalFailed++
			} else {
				totalSent++
			}
		}
	}

	now := time.Now()
	announcement.Status = "sent"
	announcement.SentAt = &now
	announcement.TotalSent = totalSent
	announcement.TotalFailed = totalFailed

	err = s.repo.Update(announcement)
	return totalSent, totalFailed, err
}

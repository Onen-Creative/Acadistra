package repositories

import (
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type AnnouncementRepository interface {
	Create(announcement *models.SystemAnnouncement) error
	Update(announcement *models.SystemAnnouncement) error
	Delete(id string) error
	FindByID(id string) (*models.SystemAnnouncement, error)
	FindByIDWithCreator(id string) (*models.SystemAnnouncement, error)
	FindAll(schoolID, userRole string) ([]models.SystemAnnouncement, error)
	FindTargetUsers(schoolID *string, roles []string) ([]models.User, error)
	CreateNotification(notification *models.UserNotification) error
}

type announcementRepository struct {
	db *gorm.DB
}

func NewAnnouncementRepository(db *gorm.DB) AnnouncementRepository {
	return &announcementRepository{db: db}
}

func (r *announcementRepository) Create(announcement *models.SystemAnnouncement) error {
	return r.db.Create(announcement).Error
}

func (r *announcementRepository) Update(announcement *models.SystemAnnouncement) error {
	return r.db.Save(announcement).Error
}

func (r *announcementRepository) Delete(id string) error {
	return r.db.Delete(&models.SystemAnnouncement{}, "id = ?", id).Error
}

func (r *announcementRepository) FindByID(id string) (*models.SystemAnnouncement, error) {
	var announcement models.SystemAnnouncement
	err := r.db.First(&announcement, "id = ?", id).Error
	return &announcement, err
}

func (r *announcementRepository) FindByIDWithCreator(id string) (*models.SystemAnnouncement, error) {
	var announcement models.SystemAnnouncement
	err := r.db.Preload("Creator").First(&announcement, "id = ?", id).Error
	return &announcement, err
}

func (r *announcementRepository) FindAll(schoolID, userRole string) ([]models.SystemAnnouncement, error) {
	var announcements []models.SystemAnnouncement
	query := r.db.Order("created_at DESC")
	
	if userRole == "school_admin" && schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}
	
	err := query.Find(&announcements).Error
	return announcements, err
}

func (r *announcementRepository) FindTargetUsers(schoolID *string, roles []string) ([]models.User, error) {
	var users []models.User
	query := r.db.Where("is_active = ?", true)
	
	if schoolID != nil {
		query = query.Where("school_id = ?", schoolID)
	}
	
	if len(roles) > 0 {
		query = query.Where("role IN ?", roles)
	}
	
	err := query.Find(&users).Error
	return users, err
}

func (r *announcementRepository) CreateNotification(notification *models.UserNotification) error {
	return r.db.Create(notification).Error
}

package repositories

import (
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type AuditRepository struct {
	db *gorm.DB
}

func NewAuditRepository(db *gorm.DB) *AuditRepository {
	return &AuditRepository{db: db}
}

type ActivityWithUser struct {
	models.AuditLog
	UserName   string `json:"user_name"`
	SchoolName string `json:"school_name,omitempty"`
}

func (r *AuditRepository) GetRecentActivity(limit int, actionFilter string) ([]ActivityWithUser, error) {
	query := r.db.Table("audit_logs").
		Select("audit_logs.*, users.full_name as user_name, schools.name as school_name").
		Joins("LEFT JOIN users ON audit_logs.actor_user_id = users.id").
		Joins("LEFT JOIN schools ON users.school_id = schools.id")

	if actionFilter != "" {
		query = query.Where("audit_logs.action = ?", actionFilter)
	}

	var activities []ActivityWithUser
	err := query.Order("audit_logs.timestamp DESC").
		Limit(limit).
		Scan(&activities).Error

	return activities, err
}

func (r *AuditRepository) CreateAuditLog(userID uuid.UUID, action, resourceType string, resourceID uuid.UUID, before, after models.JSONB, ip string) {
	auditLog := models.AuditLog{
		ActorUserID:  userID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Before:       before,
		After:        after,
		Timestamp:    time.Now(),
	}
	r.db.Create(&auditLog)
}

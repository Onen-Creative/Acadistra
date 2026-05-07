package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type IntegrationActivityRepository struct {
	db *gorm.DB
}

func NewIntegrationActivityRepository(db *gorm.DB) *IntegrationActivityRepository {
	return &IntegrationActivityRepository{db: db}
}

func (r *IntegrationActivityRepository) FindByClass(schoolID, classID, subjectID, term, year string) ([]models.IntegrationActivity, error) {
	query := r.db.Where("class_id = ? AND term = ? AND year = ? AND school_id = ?", classID, term, year, schoolID)
	if subjectID != "" {
		query = query.Where("subject_id = ?", subjectID)
	}

	var activities []models.IntegrationActivity
	err := query.Preload("Student").Preload("Subject").Find(&activities).Error
	return activities, err
}

func (r *IntegrationActivityRepository) CreateOrUpdate(schoolID, studentID, subjectID, classID uuid.UUID, term string, year int, marks models.JSONB) (*models.IntegrationActivity, error) {
	var activity models.IntegrationActivity
	err := r.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ?", studentID, subjectID, term, year).
		First(&activity).Error

	if err == gorm.ErrRecordNotFound {
		activity = models.IntegrationActivity{
			StudentID: studentID,
			SubjectID: subjectID,
			ClassID:   classID,
			SchoolID:  schoolID,
			Term:      term,
			Year:      year,
			Marks:     marks,
		}
		err = r.db.Create(&activity).Error
	} else if err == nil {
		activity.Marks = marks
		err = r.db.Save(&activity).Error
	}

	return &activity, err
}

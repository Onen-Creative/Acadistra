package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type LessonRepository interface {
	Create(lesson *models.Lesson) error
	Update(lesson *models.Lesson) error
	Delete(id, schoolID uuid.UUID) error
	FindByID(id, schoolID uuid.UUID) (*models.Lesson, error)
	FindByFilters(schoolID uuid.UUID, filters map[string]interface{}) ([]models.Lesson, error)
	FindByTeacher(teacherID, schoolID uuid.UUID, date string) ([]models.Lesson, error)
	FindByClass(classID, schoolID uuid.UUID, date string) ([]models.Lesson, error)
	GetTeacherStats(teacherID, schoolID uuid.UUID, term, year string) (map[string]interface{}, error)
	
	CreatePlan(plan *models.LessonPlan) error
	UpdatePlan(plan *models.LessonPlan) error
	DeletePlan(id, schoolID uuid.UUID) error
	FindPlansByFilters(schoolID uuid.UUID, filters map[string]interface{}) ([]models.LessonPlan, error)
}

type lessonRepository struct {
	db *gorm.DB
}

func NewLessonRepository(db *gorm.DB) LessonRepository {
	return &lessonRepository{db: db}
}

func (r *lessonRepository) Create(lesson *models.Lesson) error {
	return r.db.Create(lesson).Error
}

func (r *lessonRepository) Update(lesson *models.Lesson) error {
	return r.db.Save(lesson).Error
}

func (r *lessonRepository) Delete(id, schoolID uuid.UUID) error {
	return r.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Lesson{}).Error
}

func (r *lessonRepository) FindByID(id, schoolID uuid.UUID) (*models.Lesson, error) {
	var lesson models.Lesson
	err := r.db.Where("id = ? AND school_id = ?", id, schoolID).
		Preload("Teacher").Preload("Class").Preload("Subject").
		First(&lesson).Error
	return &lesson, err
}

func (r *lessonRepository) FindByFilters(schoolID uuid.UUID, filters map[string]interface{}) ([]models.Lesson, error) {
	query := r.db.Where("school_id = ?", schoolID)
	
	for key, value := range filters {
		if value != "" && value != nil {
			query = query.Where(key+" = ?", value)
		}
	}
	
	var lessons []models.Lesson
	err := query.Preload("Teacher").Preload("Class").Preload("Subject").
		Order("date DESC, period ASC").Find(&lessons).Error
	return lessons, err
}

func (r *lessonRepository) FindByTeacher(teacherID, schoolID uuid.UUID, date string) ([]models.Lesson, error) {
	query := r.db.Where("teacher_id = ? AND school_id = ?", teacherID, schoolID)
	if date != "" {
		query = query.Where("date = ?", date)
	}
	
	var lessons []models.Lesson
	err := query.Preload("Class").Preload("Subject").
		Order("date ASC, period ASC").Find(&lessons).Error
	return lessons, err
}

func (r *lessonRepository) FindByClass(classID, schoolID uuid.UUID, date string) ([]models.Lesson, error) {
	query := r.db.Where("class_id = ? AND school_id = ?", classID, schoolID)
	if date != "" {
		query = query.Where("date = ?", date)
	}
	
	var lessons []models.Lesson
	err := query.Preload("Teacher").Preload("Subject").
		Order("date ASC, period ASC").Find(&lessons).Error
	return lessons, err
}

func (r *lessonRepository) GetTeacherStats(teacherID, schoolID uuid.UUID, term, year string) (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	
	var totalLessons, completedLessons, totalPlans int64
	
	r.db.Model(&models.Lesson{}).
		Where("teacher_id = ? AND school_id = ? AND term = ? AND year = ?", teacherID, schoolID, term, year).
		Count(&totalLessons)
	
	r.db.Model(&models.Lesson{}).
		Where("teacher_id = ? AND school_id = ? AND term = ? AND year = ? AND status = ?", 
			teacherID, schoolID, term, year, "completed").
		Count(&completedLessons)
	
	r.db.Model(&models.LessonPlan{}).
		Where("teacher_id = ? AND school_id = ? AND term = ? AND year = ?", teacherID, schoolID, term, year).
		Count(&totalPlans)
	
	stats["total_lessons"] = totalLessons
	stats["completed_lessons"] = completedLessons
	stats["total_plans"] = totalPlans
	
	return stats, nil
}

func (r *lessonRepository) CreatePlan(plan *models.LessonPlan) error {
	return r.db.Create(plan).Error
}

func (r *lessonRepository) UpdatePlan(plan *models.LessonPlan) error {
	return r.db.Save(plan).Error
}

func (r *lessonRepository) DeletePlan(id, schoolID uuid.UUID) error {
	return r.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.LessonPlan{}).Error
}

func (r *lessonRepository) FindPlansByFilters(schoolID uuid.UUID, filters map[string]interface{}) ([]models.LessonPlan, error) {
	query := r.db.Where("school_id = ?", schoolID)
	
	for key, value := range filters {
		if value != "" && value != nil {
			query = query.Where(key+" = ?", value)
		}
	}
	
	var plans []models.LessonPlan
	err := query.Preload("Teacher").Preload("Subject").
		Order("week ASC").Find(&plans).Error
	return plans, err
}

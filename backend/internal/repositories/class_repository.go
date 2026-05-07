package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// ClassRepository defines class-specific database operations
type ClassRepository interface {
	BaseRepository
	FindBySchoolID(schoolID uuid.UUID) ([]models.Class, error)
	FindByYearAndTerm(schoolID uuid.UUID, year int, term string) ([]models.Class, error)
	FindWithStudentCount(schoolID uuid.UUID) ([]map[string]interface{}, error)
	FindByLevel(schoolID uuid.UUID, level string) ([]models.Class, error)
	UpdateTeacher(classID, teacherID uuid.UUID) error
	FindDuplicate(schoolID uuid.UUID, level, stream, year, term string) (*models.Class, error)
	CountActiveEnrollments(classID string) (int64, error)
	FindByFilters(schoolID, year, term, level string) ([]models.Class, error)
	FindByTeacherName(schoolID, name string) ([]models.Class, error)
}

type classRepository struct {
	*baseRepository
}

// NewClassRepository creates a new class repository
func NewClassRepository(db *gorm.DB) ClassRepository {
	return &classRepository{
		baseRepository: &baseRepository{db: db},
	}
}

func (r *classRepository) FindBySchoolID(schoolID uuid.UUID) ([]models.Class, error) {
	var classes []models.Class
	err := r.db.Where("school_id = ?", schoolID).
		Order("level ASC, stream ASC").
		Find(&classes).Error
	return classes, err
}

func (r *classRepository) FindByYearAndTerm(schoolID uuid.UUID, year int, term string) ([]models.Class, error) {
	var classes []models.Class
	err := r.db.Where("school_id = ? AND year = ? AND term = ?", schoolID, year, term).
		Order("level ASC, stream ASC").
		Find(&classes).Error
	return classes, err
}

func (r *classRepository) FindWithStudentCount(schoolID uuid.UUID) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	
	err := r.db.Table("classes").
		Select("classes.*, COUNT(enrollments.id) as student_count, staff.first_name as teacher_first_name, staff.last_name as teacher_last_name").
		Joins("LEFT JOIN enrollments ON classes.id = enrollments.class_id AND enrollments.status = 'active'").
		Joins("LEFT JOIN teacher_profiles ON classes.teacher_id = teacher_profiles.id").
		Joins("LEFT JOIN staff ON teacher_profiles.staff_id = staff.id").
		Where("classes.school_id = ?", schoolID).
		Group("classes.id, staff.first_name, staff.last_name").
		Order("classes.level ASC, classes.stream ASC").
		Scan(&results).Error
	
	return results, err
}

func (r *classRepository) FindByLevel(schoolID uuid.UUID, level string) ([]models.Class, error) {
	var classes []models.Class
	err := r.db.Where("school_id = ? AND level = ?", schoolID, level).
		Order("stream ASC").
		Find(&classes).Error
	return classes, err
}

func (r *classRepository) UpdateTeacher(classID, teacherID uuid.UUID) error {
	return r.db.Model(&models.Class{}).
		Where("id = ?", classID).
		Update("teacher_id", teacherID).Error
}

func (r *classRepository) FindDuplicate(schoolID uuid.UUID, level, stream, year, term string) (*models.Class, error) {
	var class models.Class
	err := r.db.Where("school_id = ? AND level = ? AND stream = ? AND year = ? AND term = ?",
		schoolID, level, stream, year, term).First(&class).Error
	if err != nil {
		return nil, err
	}
	return &class, nil
}

func (r *classRepository) CountActiveEnrollments(classID string) (int64, error) {
	var count int64
	err := r.db.Model(&models.Enrollment{}).
		Joins("JOIN students ON students.id = enrollments.student_id AND students.deleted_at IS NULL").
		Where("enrollments.class_id = ? AND enrollments.status = ?", classID, "active").
		Count(&count).Error
	return count, err
}

func (r *classRepository) FindByFilters(schoolID, year, term, level string) ([]models.Class, error) {
	query := r.db.Preload("TeacherProfile.Staff")
	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if level != "" {
		query = query.Where("level = ?", level)
	}
	var classes []models.Class
	err := query.Order("level, stream").Find(&classes).Error
	return classes, err
}

func (r *classRepository) FindByTeacherName(schoolID, name string) ([]models.Class, error) {
	var classes []models.Class
	err := r.db.Joins("JOIN teacher_profiles ON teacher_profiles.id = classes.teacher_profile_id").
		Joins("JOIN staff ON staff.id = teacher_profiles.staff_id").
		Where("staff.first_name LIKE ? OR staff.last_name LIKE ?", "%"+name+"%", "%"+name+"%").
		Where("classes.school_id = ?", schoolID).
		Preload("TeacherProfile.Staff").
		Find(&classes).Error
	return classes, err
}

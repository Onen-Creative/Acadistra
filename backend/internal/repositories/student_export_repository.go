package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type StudentExportRepository interface {
	FindStudentsWithFilters(schoolID, level, classID, year, term, gender, search string) ([]models.Student, error)
	LoadGuardians(studentID uuid.UUID) ([]models.Guardian, error)
	LoadActiveEnrollment(studentID uuid.UUID) (*models.Enrollment, error)
}

type studentExportRepository struct {
	db *gorm.DB
}

func NewStudentExportRepository(db *gorm.DB) StudentExportRepository {
	return &studentExportRepository{db: db}
}

func (r *studentExportRepository) FindStudentsWithFilters(schoolID, level, classID, year, term, gender, search string) ([]models.Student, error) {
	query := r.db.Table("students").Where("students.school_id = ? AND students.deleted_at IS NULL", schoolID)

	needsJoin := level != "" || classID != "" || year != "" || term != ""

	if needsJoin {
		query = query.Joins("INNER JOIN enrollments ON enrollments.student_id = students.id AND enrollments.status = 'active'")
		query = query.Joins("INNER JOIN classes ON classes.id = enrollments.class_id")

		if level != "" {
			query = query.Where("classes.level = ?", level)
		}
		if classID != "" {
			query = query.Where("enrollments.class_id = ?", classID)
		}
		if year != "" {
			query = query.Where("enrollments.year = ?", year)
		}
		if term != "" {
			query = query.Where("enrollments.term = ?", term)
		}
	}

	if gender != "" {
		query = query.Where("students.gender = ?", gender)
	}

	if search != "" {
		query = query.Where("(LOWER(students.first_name) LIKE LOWER(?) OR LOWER(students.middle_name) LIKE LOWER(?) OR LOWER(students.last_name) LIKE LOWER(?) OR LOWER(students.admission_no) LIKE LOWER(?))",
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	query = query.Select("DISTINCT students.*")

	var students []models.Student
	err := query.Order("students.first_name, students.last_name").Find(&students).Error
	return students, err
}

func (r *studentExportRepository) LoadGuardians(studentID uuid.UUID) ([]models.Guardian, error) {
	var guardians []models.Guardian
	err := r.db.Where("student_id = ?", studentID).Find(&guardians).Error
	return guardians, err
}

func (r *studentExportRepository) LoadActiveEnrollment(studentID uuid.UUID) (*models.Enrollment, error) {
	var enrollment models.Enrollment
	err := r.db.Preload("Class").Where("student_id = ? AND status = 'active'", studentID).First(&enrollment).Error
	if err != nil {
		return nil, err
	}
	return &enrollment, nil
}

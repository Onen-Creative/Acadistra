package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type MarksExportRepository interface {
	FindClassByID(classID, schoolID string) (*models.Class, error)
	FindEnrollmentsByClassID(classID string) ([]models.Enrollment, error)
	FindSubjectsByLevel(level string) ([]models.StandardSubject, error)
	FindResultsByStudentsAndTerm(studentIDs []uuid.UUID, term, year string) ([]models.SubjectResult, error)
}

type marksExportRepository struct {
	db *gorm.DB
}

func NewMarksExportRepository(db *gorm.DB) MarksExportRepository {
	return &marksExportRepository{db: db}
}

func (r *marksExportRepository) FindClassByID(classID, schoolID string) (*models.Class, error) {
	var class models.Class
	err := r.db.Where("id = ? AND school_id = ?", classID, schoolID).First(&class).Error
	return &class, err
}

func (r *marksExportRepository) FindEnrollmentsByClassID(classID string) ([]models.Enrollment, error) {
	var enrollments []models.Enrollment
	err := r.db.Preload("Student").Where("class_id = ?", classID).Find(&enrollments).Error
	return enrollments, err
}

func (r *marksExportRepository) FindSubjectsByLevel(level string) ([]models.StandardSubject, error) {
	var subjects []models.StandardSubject
	err := r.db.Where("level = ?", level).Order("name").Find(&subjects).Error
	return subjects, err
}

func (r *marksExportRepository) FindResultsByStudentsAndTerm(studentIDs []uuid.UUID, term, year string) ([]models.SubjectResult, error) {
	var results []models.SubjectResult
	err := r.db.Where("student_id IN ? AND term = ? AND year = ?", studentIDs, term, year).Find(&results).Error
	return results, err
}

package repositories

import (
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type BulkAOIMarksImportRepository interface {
	FindStudentByAdmissionNo(admissionNo, schoolID string) (*models.Student, error)
	FindClassByID(classID, schoolID string) (*models.Class, error)
	CreateIntegrationActivity(activity *models.IntegrationActivity) error
	FindStudentsByClassID(classID, schoolID string) ([]models.Student, error)
}

type bulkAOIMarksImportRepository struct {
	db *gorm.DB
}

func NewBulkAOIMarksImportRepository(db *gorm.DB) BulkAOIMarksImportRepository {
	return &bulkAOIMarksImportRepository{db: db}
}

func (r *bulkAOIMarksImportRepository) FindStudentByAdmissionNo(admissionNo, schoolID string) (*models.Student, error) {
	var student models.Student
	err := r.db.Where("admission_no = ? AND school_id = ?", admissionNo, schoolID).First(&student).Error
	return &student, err
}

func (r *bulkAOIMarksImportRepository) FindClassByID(classID, schoolID string) (*models.Class, error) {
	var class models.Class
	err := r.db.Where("id = ? AND school_id = ?", classID, schoolID).First(&class).Error
	return &class, err
}

func (r *bulkAOIMarksImportRepository) CreateIntegrationActivity(activity *models.IntegrationActivity) error {
	return r.db.Create(activity).Error
}

func (r *bulkAOIMarksImportRepository) FindStudentsByClassID(classID, schoolID string) ([]models.Student, error) {
	var students []models.Student
	err := r.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND students.school_id = ? AND enrollments.status = 'active'", classID, schoolID).
		Order("students.first_name ASC, students.last_name ASC").
		Find(&students).Error
	return students, err
}

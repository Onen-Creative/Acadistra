package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type BulkExamMarksImportRepository interface {
	FindStudentByAdmissionNo(admissionNo, schoolID string) (*models.Student, error)
	FindExistingResult(studentID, subjectID uuid.UUID, term string, year int, examType string, paper int) (*models.SubjectResult, error)
	CreateResult(result *models.SubjectResult) error
	UpdateResult(result *models.SubjectResult) error
	FindStudentsByClassID(classID, schoolID string) ([]models.Student, error)
	FindClassByID(classID string) (*models.Class, error)
	GetDB() *gorm.DB
}

type bulkExamMarksImportRepository struct {
	db *gorm.DB
}

func NewBulkExamMarksImportRepository(db *gorm.DB) BulkExamMarksImportRepository {
	return &bulkExamMarksImportRepository{db: db}
}

func (r *bulkExamMarksImportRepository) FindStudentByAdmissionNo(admissionNo, schoolID string) (*models.Student, error) {
	var student models.Student
	err := r.db.Where("admission_no = ? AND school_id = ?", admissionNo, schoolID).First(&student).Error
	return &student, err
}

func (r *bulkExamMarksImportRepository) FindExistingResult(studentID, subjectID uuid.UUID, term string, year int, examType string, paper int) (*models.SubjectResult, error) {
	var result models.SubjectResult
	err := r.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ? AND paper = ?",
		studentID, subjectID, term, year, examType, paper).First(&result).Error
	return &result, err
}

func (r *bulkExamMarksImportRepository) CreateResult(result *models.SubjectResult) error {
	return r.db.Create(result).Error
}

func (r *bulkExamMarksImportRepository) UpdateResult(result *models.SubjectResult) error {
	return r.db.Save(result).Error
}

func (r *bulkExamMarksImportRepository) FindStudentsByClassID(classID, schoolID string) ([]models.Student, error) {
	var students []models.Student
	err := r.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND students.school_id = ? AND enrollments.status = 'active'", classID, schoolID).
		Order("students.first_name ASC, students.last_name ASC").
		Find(&students).Error
	return students, err
}

func (r *bulkExamMarksImportRepository) FindClassByID(classID string) (*models.Class, error) {
	var class models.Class
	err := r.db.Where("id = ?", classID).First(&class).Error
	return &class, err
}

func (r *bulkExamMarksImportRepository) GetDB() *gorm.DB {
	return r.db
}

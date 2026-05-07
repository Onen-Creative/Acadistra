package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type BulkImportXLSXRepository interface {
	FindClassByID(classID uuid.UUID) (*models.Class, error)
	FindSubjectByID(subjectID uuid.UUID) (*models.StandardSubject, error)
	FindStudentsByLevel(schoolID uuid.UUID, level string) ([]models.Student, error)
	FindStudentsByClassID(classID, schoolID uuid.UUID) ([]models.Student, error)
	FindStudentByAdmissionNo(schoolID uuid.UUID, admissionNo string) (*models.Student, error)
	FindEnrollmentByStudent(studentID uuid.UUID) (*models.Enrollment, error)
	CreateBulkImport(bulkImport *models.BulkImport) error
	FindBulkImportByID(importID uuid.UUID) (*models.BulkImport, error)
	UpdateBulkImportStatus(importID uuid.UUID, status string) error
	ListBulkImports(schoolID uuid.UUID, status string) ([]map[string]interface{}, error)
	GetBulkImportDetails(importID, schoolID uuid.UUID) (map[string]interface{}, error)
	CreateStudent(student *models.Student) error
	CreateEnrollment(enrollment *models.Enrollment) error
	CreateGuardian(guardian *models.Guardian) error
	CreateResult(result *models.SubjectResult) error
	BeginTransaction() *gorm.DB
}

type bulkImportXLSXRepository struct {
	db *gorm.DB
}

func NewBulkImportXLSXRepository(db *gorm.DB) BulkImportXLSXRepository {
	return &bulkImportXLSXRepository{db: db}
}

func (r *bulkImportXLSXRepository) FindClassByID(classID uuid.UUID) (*models.Class, error) {
	var class models.Class
	err := r.db.First(&class, classID).Error
	if err != nil {
		return nil, err
	}
	return &class, nil
}

func (r *bulkImportXLSXRepository) FindSubjectByID(subjectID uuid.UUID) (*models.StandardSubject, error) {
	var subject models.StandardSubject
	err := r.db.First(&subject, subjectID).Error
	if err != nil {
		return nil, err
	}
	return &subject, nil
}

func (r *bulkImportXLSXRepository) FindStudentsByLevel(schoolID uuid.UUID, level string) ([]models.Student, error) {
	var students []models.Student
	err := r.db.Table("students").
		Select("students.id, students.admission_no, students.first_name, students.last_name").
		Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Joins("JOIN classes ON classes.id = enrollments.class_id").
		Where("students.school_id = ? AND classes.level = ?", schoolID, level).
		Scan(&students).Error
	return students, err
}

func (r *bulkImportXLSXRepository) FindStudentsByClassID(classID, schoolID uuid.UUID) ([]models.Student, error) {
	var students []models.Student
	err := r.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND students.school_id = ?", classID, schoolID).
		Find(&students).Error
	return students, err
}

func (r *bulkImportXLSXRepository) FindStudentByAdmissionNo(schoolID uuid.UUID, admissionNo string) (*models.Student, error) {
	var student models.Student
	err := r.db.Where("school_id = ? AND admission_no = ?", schoolID, admissionNo).First(&student).Error
	if err != nil {
		return nil, err
	}
	return &student, nil
}

func (r *bulkImportXLSXRepository) FindEnrollmentByStudent(studentID uuid.UUID) (*models.Enrollment, error) {
	var enrollment models.Enrollment
	err := r.db.Joins("JOIN classes ON classes.id = enrollments.class_id").
		Where("enrollments.student_id = ?", studentID).
		First(&enrollment).Error
	if err != nil {
		return nil, err
	}
	return &enrollment, nil
}

func (r *bulkImportXLSXRepository) CreateBulkImport(bulkImport *models.BulkImport) error {
	return r.db.Create(bulkImport).Error
}

func (r *bulkImportXLSXRepository) FindBulkImportByID(importID uuid.UUID) (*models.BulkImport, error) {
	var bulkImport models.BulkImport
	err := r.db.First(&bulkImport, importID).Error
	if err != nil {
		return nil, err
	}
	return &bulkImport, nil
}

func (r *bulkImportXLSXRepository) UpdateBulkImportStatus(importID uuid.UUID, status string) error {
	return r.db.Model(&models.BulkImport{}).Where("id = ?", importID).Update("status", status).Error
}

func (r *bulkImportXLSXRepository) ListBulkImports(schoolID uuid.UUID, status string) ([]map[string]interface{}, error) {
	var imports []map[string]interface{}
	err := r.db.Table("bulk_imports").
		Select("id, import_type, status, total_rows, valid_rows, invalid_rows, uploaded_by, created_at").
		Where("school_id = ? AND status = ?", schoolID, status).
		Order("created_at DESC").
		Scan(&imports).Error
	return imports, err
}

func (r *bulkImportXLSXRepository) GetBulkImportDetails(importID, schoolID uuid.UUID) (map[string]interface{}, error) {
	var bulkImport map[string]interface{}
	err := r.db.Table("bulk_imports").
		Where("id = ? AND school_id = ?", importID, schoolID).
		First(&bulkImport).Error
	return bulkImport, err
}

func (r *bulkImportXLSXRepository) CreateStudent(student *models.Student) error {
	return r.db.Create(student).Error
}

func (r *bulkImportXLSXRepository) CreateEnrollment(enrollment *models.Enrollment) error {
	return r.db.Create(enrollment).Error
}

func (r *bulkImportXLSXRepository) CreateGuardian(guardian *models.Guardian) error {
	return r.db.Create(guardian).Error
}

func (r *bulkImportXLSXRepository) CreateResult(result *models.SubjectResult) error {
	return r.db.Create(result).Error
}

func (r *bulkImportXLSXRepository) BeginTransaction() *gorm.DB {
	return r.db.Begin()
}

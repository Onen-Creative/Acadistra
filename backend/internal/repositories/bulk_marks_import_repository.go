package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type BulkMarksImportRepository interface {
	CreateImport(marksImport *models.MarksImport) error
	FindImportByID(importID, schoolID uuid.UUID) (*models.MarksImport, error)
	FindImportsBySchoolID(schoolID uuid.UUID, status string) ([]models.MarksImport, error)
	UpdateImport(marksImport *models.MarksImport) error
	CountExistingMarks(schoolID, classID, subjectID uuid.UUID, term string, year int, examType string) (int64, error)
	CountExistingMarksWithPaper(schoolID, classID, subjectID uuid.UUID, term string, year int, examType string, paper int) (int64, error)
	FindStudentByAdmissionNo(admissionNo string, schoolID uuid.UUID) (*models.Student, error)
	FindStudentsByClassID(classID, schoolID uuid.UUID) ([]models.Student, error)
	FindClassByID(classID uuid.UUID) (*models.Class, error)
	FindSchoolByID(schoolID uuid.UUID) (*models.School, error)
	FindSubjectByID(subjectID uuid.UUID) (*models.StandardSubject, error)
	CreateResult(result *models.SubjectResult) error
}

type bulkMarksImportRepository struct {
	db *gorm.DB
}

func NewBulkMarksImportRepository(db *gorm.DB) BulkMarksImportRepository {
	return &bulkMarksImportRepository{db: db}
}

func (r *bulkMarksImportRepository) CreateImport(marksImport *models.MarksImport) error {
	return r.db.Create(marksImport).Error
}

func (r *bulkMarksImportRepository) FindImportByID(importID, schoolID uuid.UUID) (*models.MarksImport, error) {
	var marksImport models.MarksImport
	err := r.db.Where("id = ? AND school_id = ?", importID, schoolID).
		Preload("Class").
		Preload("Subject").
		Preload("Uploader").
		Preload("Approver").
		First(&marksImport).Error
	if err != nil {
		return nil, err
	}
	return &marksImport, nil
}

func (r *bulkMarksImportRepository) FindImportsBySchoolID(schoolID uuid.UUID, status string) ([]models.MarksImport, error) {
	var imports []models.MarksImport
	query := r.db.Where("school_id = ?", schoolID).
		Preload("Class").
		Preload("Subject").
		Preload("Uploader").
		Preload("Approver").
		Order("created_at DESC")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	err := query.Find(&imports).Error
	return imports, err
}

func (r *bulkMarksImportRepository) UpdateImport(marksImport *models.MarksImport) error {
	return r.db.Save(marksImport).Error
}

func (r *bulkMarksImportRepository) CountExistingMarks(schoolID, classID, subjectID uuid.UUID, term string, year int, examType string) (int64, error) {
	var count int64
	err := r.db.Model(&models.SubjectResult{}).
		Where("school_id = ? AND class_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ?",
			schoolID, classID, subjectID, term, year, examType).
		Count(&count).Error
	return count, err
}

func (r *bulkMarksImportRepository) CountExistingMarksWithPaper(schoolID, classID, subjectID uuid.UUID, term string, year int, examType string, paper int) (int64, error) {
	var count int64
	query := r.db.Model(&models.SubjectResult{}).
		Where("school_id = ? AND class_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ?",
			schoolID, classID, subjectID, term, year, examType)
	
	// If paper is specified (Advanced Level), check for that specific paper
	if paper > 0 {
		query = query.Where("paper = ?", paper)
	}
	
	err := query.Count(&count).Error
	return count, err
}

func (r *bulkMarksImportRepository) FindStudentByAdmissionNo(admissionNo string, schoolID uuid.UUID) (*models.Student, error) {
	var student models.Student
	err := r.db.Where("admission_no = ? AND school_id = ?", admissionNo, schoolID).First(&student).Error
	if err != nil {
		return nil, err
	}
	return &student, nil
}

func (r *bulkMarksImportRepository) FindStudentsByClassID(classID, schoolID uuid.UUID) ([]models.Student, error) {
	var students []models.Student
	err := r.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND students.school_id = ?", classID, schoolID).
		Find(&students).Error
	return students, err
}

func (r *bulkMarksImportRepository) FindClassByID(classID uuid.UUID) (*models.Class, error) {
	var class models.Class
	err := r.db.First(&class, classID).Error
	if err != nil {
		return nil, err
	}
	return &class, nil
}

func (r *bulkMarksImportRepository) FindSchoolByID(schoolID uuid.UUID) (*models.School, error) {
	var school models.School
	err := r.db.First(&school, schoolID).Error
	if err != nil {
		return nil, err
	}
	return &school, nil
}

func (r *bulkMarksImportRepository) FindSubjectByID(subjectID uuid.UUID) (*models.StandardSubject, error) {
	var subject models.StandardSubject
	err := r.db.First(&subject, subjectID).Error
	if err != nil {
		return nil, err
	}
	return &subject, nil
}

func (r *bulkMarksImportRepository) CreateResult(result *models.SubjectResult) error {
	return r.db.Create(result).Error
}

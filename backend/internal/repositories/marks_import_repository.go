package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type MarksImportRepository interface {
	FindStudentByAdmissionNo(admissionNo, schoolID string) (*models.Student, error)
	FindStandardSubjectByCode(code string) (*models.StandardSubject, error)
	FindClassByName(name, schoolID string) (*models.Class, error)
	FindAssessment(schoolID string, classID, subjectID uuid.UUID, assessmentType, term string, year int) (*models.Assessment, error)
	CreateAssessment(assessment *models.Assessment) error
	FindMark(assessmentID, studentID uuid.UUID) (*models.Mark, error)
	CreateMark(mark *models.Mark) error
	UpdateMark(mark *models.Mark) error
}

type marksImportRepository struct {
	db *gorm.DB
}

func NewMarksImportRepository(db *gorm.DB) MarksImportRepository {
	return &marksImportRepository{db: db}
}

func (r *marksImportRepository) FindStudentByAdmissionNo(admissionNo, schoolID string) (*models.Student, error) {
	var student models.Student
	err := r.db.Where("admission_no = ? AND school_id = ?", admissionNo, schoolID).First(&student).Error
	if err != nil {
		return nil, err
	}
	return &student, nil
}

func (r *marksImportRepository) FindStandardSubjectByCode(code string) (*models.StandardSubject, error) {
	var subject models.StandardSubject
	err := r.db.Where("code = ?", code).First(&subject).Error
	if err != nil {
		return nil, err
	}
	return &subject, nil
}

func (r *marksImportRepository) FindClassByName(name, schoolID string) (*models.Class, error) {
	var class models.Class
	err := r.db.Where("name = ? AND school_id = ?", name, schoolID).First(&class).Error
	if err != nil {
		return nil, err
	}
	return &class, nil
}

func (r *marksImportRepository) FindAssessment(schoolID string, classID, subjectID uuid.UUID, assessmentType, term string, year int) (*models.Assessment, error) {
	var assessment models.Assessment
	err := r.db.Where("school_id = ? AND class_id = ? AND subject_id = ? AND assessment_type = ? AND term = ? AND year = ?",
		schoolID, classID, subjectID, assessmentType, term, year).First(&assessment).Error
	if err != nil {
		return nil, err
	}
	return &assessment, nil
}

func (r *marksImportRepository) CreateAssessment(assessment *models.Assessment) error {
	return r.db.Create(assessment).Error
}

func (r *marksImportRepository) FindMark(assessmentID, studentID uuid.UUID) (*models.Mark, error) {
	var mark models.Mark
	err := r.db.Where("assessment_id = ? AND student_id = ?", assessmentID, studentID).First(&mark).Error
	if err != nil {
		return nil, err
	}
	return &mark, nil
}

func (r *marksImportRepository) CreateMark(mark *models.Mark) error {
	return r.db.Create(mark).Error
}

func (r *marksImportRepository) UpdateMark(mark *models.Mark) error {
	return r.db.Save(mark).Error
}

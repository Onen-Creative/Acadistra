package repositories

import (
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type SubjectRepository interface {
	FindStandardSubjectsByLevel(level string) ([]models.StandardSubject, error)
	FindStandardSubjectByID(id uint) (*models.StandardSubject, error)
	CreateStandardSubject(subject *models.StandardSubject) error
	
	FindSubjectsByClass(classID uint) ([]models.SubjectResult, error)
	CreateSubject(subject *models.SubjectResult) error
	UpdateSubject(subject *models.SubjectResult) error
	DeleteSubject(id uint) error
}

type subjectRepository struct {
	db *gorm.DB
}

func NewSubjectRepository(db *gorm.DB) SubjectRepository {
	return &subjectRepository{db: db}
}

func (r *subjectRepository) FindStandardSubjectsByLevel(level string) ([]models.StandardSubject, error) {
	var subjects []models.StandardSubject
	err := r.db.Where("level = ?", level).Order("name").Find(&subjects).Error
	return subjects, err
}

func (r *subjectRepository) FindStandardSubjectByID(id uint) (*models.StandardSubject, error) {
	var subject models.StandardSubject
	err := r.db.First(&subject, id).Error
	return &subject, err
}

func (r *subjectRepository) CreateStandardSubject(subject *models.StandardSubject) error {
	return r.db.Create(subject).Error
}

func (r *subjectRepository) FindSubjectsByClass(classID uint) ([]models.SubjectResult, error) {
	var subjects []models.SubjectResult
	err := r.db.Where("class_id = ?", classID).
		Preload("StandardSubject").
		Preload("Teacher").
		Order("standard_subject_id").
		Find(&subjects).Error
	return subjects, err
}

func (r *subjectRepository) CreateSubject(subject *models.SubjectResult) error {
	return r.db.Create(subject).Error
}

func (r *subjectRepository) UpdateSubject(subject *models.SubjectResult) error {
	return r.db.Save(subject).Error
}

func (r *subjectRepository) DeleteSubject(id uint) error {
	return r.db.Delete(&models.SubjectResult{}, id).Error
}

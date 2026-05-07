package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type ParentRepository interface {
	GetChildren(guardianEmail string) ([]models.Student, error)
	GetChildResults(studentID, schoolID uuid.UUID, term, year string) ([]models.SubjectResult, error)
	GetChildAttendance(studentID, schoolID uuid.UUID, startDate, endDate string) ([]models.Attendance, error)
	GetChildFees(studentID, schoolID uuid.UUID) (*models.StudentFees, error)
	VerifyAccess(guardianEmail string, studentID uuid.UUID) (bool, error)
}

type parentRepository struct {
	db *gorm.DB
}

func NewParentRepository(db *gorm.DB) ParentRepository {
	return &parentRepository{db: db}
}

func (r *parentRepository) GetChildren(guardianEmail string) ([]models.Student, error) {
	var guardian models.Guardian
	if err := r.db.Where("email = ?", guardianEmail).First(&guardian).Error; err != nil {
		return nil, err
	}
	
	var students []models.Student
	err := r.db.Where("id = ?", guardian.StudentID).
		Preload("Class").Find(&students).Error
	return students, err
}

func (r *parentRepository) GetChildResults(studentID, schoolID uuid.UUID, term, year string) ([]models.SubjectResult, error) {
	query := r.db.Where("student_id = ? AND school_id = ?", studentID, schoolID)
	
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	
	var results []models.SubjectResult
	err := query.Preload("Subject").Find(&results).Error
	return results, err
}

func (r *parentRepository) GetChildAttendance(studentID, schoolID uuid.UUID, startDate, endDate string) ([]models.Attendance, error) {
	query := r.db.Where("student_id = ? AND school_id = ?", studentID, schoolID)
	
	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("date <= ?", endDate)
	}
	
	var attendance []models.Attendance
	err := query.Order("date DESC").Find(&attendance).Error
	return attendance, err
}

func (r *parentRepository) GetChildFees(studentID, schoolID uuid.UUID) (*models.StudentFees, error) {
	var fees models.StudentFees
	err := r.db.Where("student_id = ? AND school_id = ?", studentID, schoolID).First(&fees).Error
	return &fees, err
}

func (r *parentRepository) VerifyAccess(guardianEmail string, studentID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Guardian{}).
		Where("email = ? AND student_id = ?", guardianEmail, studentID).
		Count(&count).Error
	return count > 0, err
}

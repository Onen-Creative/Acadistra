package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type RegistrationRepository interface {
	CreateStudent(student *models.Student) error
	CreateEnrollment(enrollment *models.Enrollment) error
	CreateGuardian(guardian *models.Guardian) error
	CreateBatch(student *models.Student, enrollment *models.Enrollment, guardians []models.Guardian) error
	GetLastAdmissionNumber(schoolID uuid.UUID, pattern string) (string, error)
	CheckAdmissionNumberExists(schoolID uuid.UUID, admissionNo string) (bool, error)
	GetSchool(schoolID uuid.UUID) (*models.School, error)
	GetClass(classID, schoolID uuid.UUID) (*models.Class, error)
	FindOrCreateClass(schoolID uuid.UUID, level, term string, year int) (*models.Class, error)
}

type registrationRepository struct {
	db *gorm.DB
}

func NewRegistrationRepository(db *gorm.DB) RegistrationRepository {
	return &registrationRepository{db: db}
}

func (r *registrationRepository) CreateStudent(student *models.Student) error {
	return r.db.Create(student).Error
}

func (r *registrationRepository) CreateEnrollment(enrollment *models.Enrollment) error {
	return r.db.Create(enrollment).Error
}

func (r *registrationRepository) CreateGuardian(guardian *models.Guardian) error {
	return r.db.Create(guardian).Error
}

func (r *registrationRepository) CreateBatch(student *models.Student, enrollment *models.Enrollment, guardians []models.Guardian) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(student).Error; err != nil {
			return err
		}
		
		enrollment.StudentID = student.ID
		if err := tx.Create(enrollment).Error; err != nil {
			return err
		}
		
		for i := range guardians {
			guardians[i].StudentID = student.ID
		}
		if err := tx.Create(&guardians).Error; err != nil {
			return err
		}
		
		return nil
	})
}

func (r *registrationRepository) GetLastAdmissionNumber(schoolID uuid.UUID, pattern string) (string, error) {
	var student models.Student
	err := r.db.Where("school_id = ? AND admission_no LIKE ?", schoolID, pattern).
		Order("admission_no DESC").First(&student).Error
	if err == gorm.ErrRecordNotFound {
		return "", nil
	}
	return student.AdmissionNo, err
}

func (r *registrationRepository) CheckAdmissionNumberExists(schoolID uuid.UUID, admissionNo string) (bool, error) {
	var count int64
	err := r.db.Model(&models.Student{}).Unscoped().
		Where("school_id = ? AND admission_no = ?", schoolID, admissionNo).
		Count(&count).Error
	return count > 0, err
}


func (r *registrationRepository) GetSchool(schoolID uuid.UUID) (*models.School, error) {
	var school models.School
	err := r.db.First(&school, "id = ?", schoolID).Error
	return &school, err
}

func (r *registrationRepository) GetClass(classID, schoolID uuid.UUID) (*models.Class, error) {
	var class models.Class
	err := r.db.Where("id = ? AND school_id = ?", classID, schoolID).First(&class).Error
	return &class, err
}

func (r *registrationRepository) FindOrCreateClass(schoolID uuid.UUID, level, term string, year int) (*models.Class, error) {
	var class models.Class
	err := r.db.Where("school_id = ? AND level = ? AND term = ? AND year = ?", schoolID, level, term, year).First(&class).Error
	if err == gorm.ErrRecordNotFound {
		class = models.Class{
			SchoolID: schoolID,
			Name:     level,
			Level:    level,
			Year:     year,
			Term:     term,
		}
		if err := r.db.Create(&class).Error; err != nil {
			return nil, err
		}
		return &class, nil
	}
	return &class, err
}

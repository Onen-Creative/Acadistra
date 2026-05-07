package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type UserAssignmentRepository interface {
	CreateUser(user *models.User) error
	FindUserByID(userID uuid.UUID) (*models.User, error)
	FindUsersBySchoolID(schoolID uuid.UUID) ([]models.User, error)
	UpdateUserRole(userID uuid.UUID, role string) error
	FindTeacherByID(teacherID uuid.UUID) (*models.User, error)
	FindClassByID(classID uuid.UUID) (*models.Class, error)
	AssignTeacherToClass(classID, teacherID uuid.UUID) error
}

type userAssignmentRepository struct {
	db *gorm.DB
}

func NewUserAssignmentRepository(db *gorm.DB) UserAssignmentRepository {
	return &userAssignmentRepository{db: db}
}

func (r *userAssignmentRepository) CreateUser(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *userAssignmentRepository) FindUserByID(userID uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, "id = ?", userID).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userAssignmentRepository) FindUsersBySchoolID(schoolID uuid.UUID) ([]models.User, error) {
	var users []models.User
	err := r.db.Where("school_id = ?", schoolID).Find(&users).Error
	return users, err
}

func (r *userAssignmentRepository) UpdateUserRole(userID uuid.UUID, role string) error {
	return r.db.Model(&models.User{}).Where("id = ?", userID).Update("role", role).Error
}

func (r *userAssignmentRepository) FindTeacherByID(teacherID uuid.UUID) (*models.User, error) {
	var teacher models.User
	err := r.db.First(&teacher, "id = ? AND role = 'teacher'", teacherID).Error
	if err != nil {
		return nil, err
	}
	return &teacher, nil
}

func (r *userAssignmentRepository) FindClassByID(classID uuid.UUID) (*models.Class, error) {
	var class models.Class
	err := r.db.First(&class, "id = ?", classID).Error
	if err != nil {
		return nil, err
	}
	return &class, nil
}

func (r *userAssignmentRepository) AssignTeacherToClass(classID, teacherID uuid.UUID) error {
	return r.db.Model(&models.Class{}).Where("id = ?", classID).Update("teacher_profile_id", teacherID).Error
}

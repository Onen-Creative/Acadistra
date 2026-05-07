package services

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserAssignmentService struct {
	repo repositories.UserAssignmentRepository
	db   *gorm.DB
}

func NewUserAssignmentService(repo repositories.UserAssignmentRepository, db *gorm.DB) *UserAssignmentService {
	return &UserAssignmentService{
		repo: repo,
		db:   db,
	}
}

// CreateSchoolAdmin creates a default admin user for a school
func (s *UserAssignmentService) CreateSchoolAdmin(schoolID uuid.UUID, schoolName string) (*models.User, error) {
	// Generate default admin credentials
	email := fmt.Sprintf("admin@%s.ug", generateSlug(schoolName))
	password := "Admin@123"
	
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	admin := &models.User{
		SchoolID:     &schoolID,
		Email:        email,
		PasswordHash: string(hashedPassword),
		Role:         "school_admin",
		FullName:     fmt.Sprintf("%s Administrator", schoolName),
		IsActive:     true,
		Meta: models.JSONB{
			"default_password": password,
			"must_change_password": true,
		},
	}

	if err := s.repo.CreateUser(admin); err != nil {
		return nil, fmt.Errorf("failed to create admin user: %w", err)
	}

	return admin, nil
}

// AssignTeacherToClass assigns a teacher to a specific class
func (s *UserAssignmentService) AssignTeacherToClass(teacherID, classID uuid.UUID) error {
	// Verify teacher exists and belongs to the same school as the class
	teacher, err := s.repo.FindTeacherByID(teacherID)
	if err != nil {
		return fmt.Errorf("teacher not found: %w", err)
	}
	
	class, err := s.repo.FindClassByID(classID)
	if err != nil {
		return fmt.Errorf("class not found: %w", err)
	}
	
	if teacher.SchoolID == nil || *teacher.SchoolID != class.SchoolID {
		return fmt.Errorf("teacher and class must belong to the same school")
	}

	if err := s.repo.AssignTeacherToClass(classID, teacherID); err != nil {
		return fmt.Errorf("failed to assign teacher to class: %w", err)
	}

	return nil
}

// CreateTeacher creates a new teacher for a school
func (s *UserAssignmentService) CreateTeacher(schoolID uuid.UUID, fullName, email string) (*models.User, error) {
	password := "Teacher@123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	teacher := &models.User{
		SchoolID:     &schoolID,
		Email:        email,
		PasswordHash: string(hashedPassword),
		Role:         "teacher",
		FullName:     fullName,
		IsActive:     true,
		Meta: models.JSONB{
			"default_password": password,
			"must_change_password": true,
		},
	}

	if err := s.repo.CreateUser(teacher); err != nil {
		return nil, fmt.Errorf("failed to create teacher: %w", err)
	}

	return teacher, nil
}

// GetSchoolUsers returns all users for a specific school
func (s *UserAssignmentService) GetSchoolUsers(schoolID uuid.UUID) ([]models.User, error) {
	users, err := s.repo.FindUsersBySchoolID(schoolID)
	if err != nil {
		return nil, fmt.Errorf("failed to get school users: %w", err)
	}
	return users, nil
}

// UpdateUserRole updates a user's role within the school
func (s *UserAssignmentService) UpdateUserRole(userID uuid.UUID, newRole string) error {
	validRoles := []string{"school_admin", "teacher", "librarian", "nurse", "bursar", "store_keeper"}
	isValid := false
	for _, role := range validRoles {
		if role == newRole {
			isValid = true
			break
		}
	}
	if !isValid {
		return fmt.Errorf("invalid role: %s", newRole)
	}

	if err := s.repo.UpdateUserRole(userID, newRole); err != nil {
		return fmt.Errorf("failed to update user role: %w", err)
	}

	return nil
}

// CreateStoreKeeper creates a new store keeper for a school
func (s *UserAssignmentService) CreateStoreKeeper(schoolID uuid.UUID, fullName, email string) (*models.User, error) {
	password := "StoreKeeper@123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	storeKeeper := &models.User{
		SchoolID:     &schoolID,
		Email:        email,
		PasswordHash: string(hashedPassword),
		Role:         "store_keeper",
		FullName:     fullName,
		IsActive:     true,
		Meta: models.JSONB{
			"default_password": password,
			"must_change_password": true,
		},
	}

	if err := s.repo.CreateUser(storeKeeper); err != nil {
		return nil, fmt.Errorf("failed to create store keeper: %w", err)
	}

	return storeKeeper, nil
}

func generateSlug(name string) string {
	// Simple slug generation - replace spaces with hyphens and convert to lowercase
	slug := ""
	for _, char := range name {
		if char == ' ' {
			slug += "-"
		} else if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') {
			if char >= 'A' && char <= 'Z' {
				slug += string(char + 32) // Convert to lowercase
			} else {
				slug += string(char)
			}
		}
	}
	return slug
}
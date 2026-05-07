package services

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type UserService struct {
	repo         repositories.UserRepository
	db           *gorm.DB
	authService  *AuthService
	emailService *EmailService
}

func NewUserService(repo repositories.UserRepository, db *gorm.DB, authService *AuthService, emailService *EmailService) *UserService {
	return &UserService{
		repo:         repo,
		db:           db,
		authService:  authService,
		emailService: emailService,
	}
}

type UserListResult struct {
	Users []map[string]interface{} `json:"users"`
	Total int64                    `json:"total"`
	Page  int                      `json:"page"`
	Limit int                      `json:"limit"`
}

func (s *UserService) List(search, role, schoolID string, page, limit int) (*UserListResult, error) {
	query := s.db.Model(&models.User{}).Preload("School")
	
	if search != "" {
		query = query.Where("full_name LIKE ? OR email LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if role != "" {
		query = query.Where("role = ?", role)
	}
	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}

	var total int64
	query.Count(&total)

	offset := (page - 1) * limit
	var users []models.User
	if err := query.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return nil, err
	}

	// Map users with school_name
	var response []map[string]interface{}
	for _, user := range users {
		schoolName := "System"
		if user.School != nil {
			schoolName = user.School.Name
		}
		userMap := map[string]interface{}{
			"id":         user.ID,
			"email":      user.Email,
			"full_name":  user.FullName,
			"role":       user.Role,
			"is_active":  user.IsActive,
			"school_id":  user.SchoolID,
			"created_at": user.CreatedAt,
			"school_name": schoolName,
		}
		response = append(response, userMap)
	}

	return &UserListResult{
		Users: response,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

func (s *UserService) CreateSystemAdmin(email, password, fullName, schoolID string) (*models.User, string, error) {
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return nil, "", fmt.Errorf("invalid school_id")
	}

	// Get school
	var school models.School
	if err := s.db.First(&school, "id = ?", schoolUUID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, "", fmt.Errorf("school not found")
		}
		return nil, "", fmt.Errorf("failed to fetch school: %w", err)
	}

	// Check if school is active
	if !school.IsActive {
		return nil, "", fmt.Errorf("cannot create users for inactive schools. Please activate the school first")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	user := &models.User{
		SchoolID: &schoolUUID,
		Email:    email,
		FullName: fullName,
		Role:     "school_admin",
		IsActive: true,
	}

	// Create user account
	if err := s.authService.CreateUser(user, password); err != nil {
		tx.Rollback()
		return nil, "", err
	}

	// Generate employee ID
	var schoolInitials string
	for _, word := range strings.Fields(school.Name) {
		if len(word) > 0 {
			schoolInitials += strings.ToUpper(string(word[0]))
		}
	}
	if schoolInitials == "" {
		schoolInitials = "SCH"
	}

	var lastStaff models.Staff
	var sequence int = 0
	currentYear := time.Now().Year()
	pattern := fmt.Sprintf("%s/STF/%d/%%", schoolInitials, currentYear)
	if err := tx.Where("school_id = ? AND employee_id LIKE ?", schoolUUID, pattern).
		Order("employee_id DESC").First(&lastStaff).Error; err == nil {
		parts := strings.Split(lastStaff.EmployeeID, "/")
		if len(parts) == 4 {
			var num int
			if _, scanErr := fmt.Sscanf(parts[3], "%d", &num); scanErr == nil {
				sequence = num
			}
		}
	}
	sequence++
	employeeID := fmt.Sprintf("%s/STF/%d/%03d", schoolInitials, currentYear, sequence)

	// Parse full name
	nameParts := strings.Fields(fullName)
	firstName := ""
	middleName := ""
	lastName := ""
	if len(nameParts) > 0 {
		firstName = nameParts[0]
	}
	if len(nameParts) > 2 {
		middleName = nameParts[1]
		lastName = strings.Join(nameParts[2:], " ")
	} else if len(nameParts) > 1 {
		lastName = strings.Join(nameParts[1:], " ")
	}

	// Create staff record
	staff := models.Staff{
		SchoolID:   schoolUUID,
		UserID:     &user.ID,
		EmployeeID: employeeID,
		FirstName:  firstName,
		MiddleName: middleName,
		LastName:   lastName,
		Email:      email,
		Role:       "School Admin",
		Status:     "active",
	}

	if err := tx.Create(&staff).Error; err != nil {
		tx.Rollback()
		return nil, "", fmt.Errorf("failed to create staff record: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		return nil, "", fmt.Errorf("failed to complete user creation: %w", err)
	}

	// Send welcome email
	if s.emailService != nil {
		go func() {
			if err := s.emailService.SendWelcomeEmail(email, fullName, "school_admin", school.Name, password); err != nil {
				log.Printf("Failed to send welcome email to %s: %v", email, err)
				s.db.Create(&models.Notification{
					Type:     "email_failure",
					Category: "system",
					Title:    "Email Delivery Failed",
					Message:  "Failed to send welcome email to " + email,
				})
			}
		}()
	}

	return user, employeeID, nil
}

func (s *UserService) GetByID(id, schoolID string) (*models.User, error) {
	var user models.User
	if err := s.db.Preload("School").Where("id = ? AND school_id = ?", id, schoolID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *UserService) Update(id string, updates map[string]interface{}) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}

	if password, ok := updates["password"].(string); ok && password != "" {
		hashedPassword, err := s.authService.HashPassword(password)
		if err != nil {
			return nil, fmt.Errorf("failed to hash password")
		}
		updates["password_hash"] = hashedPassword
		delete(updates, "password")
	}

	if err := s.db.Model(&user).Updates(updates).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *UserService) Delete(id string) error {
	return s.db.Delete(&models.User{}, "id = ?", id).Error
}

func (s *UserService) ListSchoolUsers(schoolID string) ([]models.User, error) {
	var users []models.User
	if err := s.db.Preload("School").Where("school_id = ?", schoolID).Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (s *UserService) CreateSchoolUser(email, password, fullName, role, schoolID string) (*models.User, error) {
	schoolUUID, _ := uuid.Parse(schoolID)
	
	// Check if school is active
	var school models.School
	if err := s.db.First(&school, "id = ?", schoolUUID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("school not found")
		}
		return nil, fmt.Errorf("failed to fetch school: %w", err)
	}
	
	if !school.IsActive {
		return nil, fmt.Errorf("cannot create users for inactive schools. Please activate the school first")
	}
	
	user := &models.User{
		SchoolID: &schoolUUID,
		Email:    email,
		FullName: fullName,
		Role:     role,
		IsActive: true,
	}

	if err := s.authService.CreateUser(user, password); err != nil {
		return nil, err
	}

	// Send welcome email
	if s.emailService != nil {
		schoolName := "Acadistra"
		if school.ID != uuid.Nil {
			schoolName = school.Name
		}
		go func() {
			if err := s.emailService.SendWelcomeEmail(email, fullName, role, schoolName, password); err != nil {
				log.Printf("Failed to send welcome email to %s: %v", email, err)
				s.db.Create(&models.Notification{
					Type:     "email_failure",
					Category: "system",
					Title:    "Email Delivery Failed",
					Message:  "Failed to send welcome email to " + email,
				})
			}
		}()
	}

	return user, nil
}

func (s *UserService) UpdateSchoolUser(id, schoolID string, updates map[string]interface{}) (*models.User, bool, error) {
	var user models.User
	if err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&user).Error; err != nil {
		return nil, false, err
	}

	if user.Role == "system_admin" || user.Role == "school_admin" {
		return nil, false, fmt.Errorf("cannot update system_admin or school_admin users")
	}

	oldRole := user.Role
	roleChanged := false

	if role, ok := updates["role"].(string); ok && role != "" && role != oldRole {
		roleChanged = true
	}

	if err := s.db.Model(&user).Updates(updates).Error; err != nil {
		return nil, false, err
	}

	return &user, roleChanged, nil
}

func (s *UserService) DeleteSchoolUser(id, schoolID string) error {
	var user models.User
	if err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&user).Error; err != nil {
		return err
	}

	if user.Role == "system_admin" || user.Role == "school_admin" {
		return fmt.Errorf("cannot delete system_admin or school_admin users")
	}

	return s.db.Delete(&user).Error
}

func (s *UserService) ResetUserPassword(userID, schoolID, newPassword string) error {
	var user models.User
	if err := s.db.Where("id = ? AND school_id = ?", userID, schoolID).First(&user).Error; err != nil {
		return err
	}

	if err := s.authService.UpdatePassword(&user, newPassword); err != nil {
		return fmt.Errorf("failed to update password")
	}

	// Send email notification
	if s.emailService != nil && user.Email != "" {
		schoolUUID, _ := uuid.Parse(schoolID)
		var school models.School
		s.db.First(&school, "id = ?", schoolUUID)
		schoolName := "Acadistra"
		if school.ID != uuid.Nil {
			schoolName = school.Name
		}
		go func() {
			if err := s.emailService.SendWelcomeEmail(user.Email, user.FullName, user.Role, schoolName, newPassword); err != nil {
				log.Printf("Failed to send password reset email to %s: %v", user.Email, err)
			}
		}()
	}

	// Delete pending password reset requests
	s.db.Where("user_id = ?", user.ID).Delete(&models.PasswordReset{})

	return nil
}

// Legacy methods for backward compatibility
func (s *UserService) Create(user *models.User) error {
	return s.repo.Create(user)
}

func (s *UserService) FindByEmail(email string) (*models.User, error) {
	return s.repo.FindByEmail(email)
}

func (s *UserService) FindBySchool(schoolID uint, role string) ([]models.User, error) {
	return s.repo.FindBySchool(schoolID, role)
}

func (s *UserService) UpdatePassword(userID uint, hashedPassword string) error {
	return s.repo.UpdatePassword(userID, hashedPassword)
}

func (s *UserService) UpdateLastLogin(userID uint) error {
	return s.repo.UpdateLastLogin(userID)
}

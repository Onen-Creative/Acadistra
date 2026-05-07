package services

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type TeacherService struct {
	repo        repositories.TeacherRepository
	db          *gorm.DB
	authService *AuthService
}

func NewTeacherService(repo repositories.TeacherRepository, db *gorm.DB, authService *AuthService) *TeacherService {
	return &TeacherService{
		repo:        repo,
		db:          db,
		authService: authService,
	}
}

func (s *TeacherService) List(schoolID, search, status string, page, limit int) ([]map[string]interface{}, int64, error) {
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return nil, 0, err
	}

	query := s.db.Table("staff").Select("staff.*, teacher_profiles.id as teacher_profile_id").
		Joins("LEFT JOIN teacher_profiles ON teacher_profiles.staff_id = staff.id").
		Where("staff.school_id = ? AND staff.role = ?", schoolUUID, "Teacher")

	if search != "" {
		query = query.Where("staff.first_name ILIKE ? OR staff.last_name ILIKE ? OR staff.employee_id ILIKE ? OR staff.email ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	if status != "" {
		query = query.Where("staff.status = ?", status)
	}

	var total int64
	s.db.Model(&models.Staff{}).Where("school_id = ? AND role = ?", schoolUUID, "Teacher").Count(&total)

	offset := (page - 1) * limit
	var teachers []map[string]interface{}
	if err := query.Offset(offset).Limit(limit).Order("staff.first_name, staff.last_name").Scan(&teachers).Error; err != nil {
		return nil, 0, err
	}

	return teachers, total, nil
}

func (s *TeacherService) Create(staff *models.Staff, schoolID string) error {
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return err
	}

	staff.SchoolID = schoolUUID
	staff.Role = "Teacher"
	staff.Status = "active"

	// Generate employee ID
	var count int64
	s.db.Model(&models.Staff{}).Where("school_id = ? AND role = ?", schoolUUID, "Teacher").Count(&count)

	for i := int(count + 1); i < int(count+100); i++ {
		employeeID := fmt.Sprintf("TCH-%03d", i)
		var exists int64
		s.db.Model(&models.Staff{}).Where("school_id = ? AND employee_id = ?", schoolUUID, employeeID).Count(&exists)
		if exists == 0 {
			staff.EmployeeID = employeeID
			break
		}
	}

	// Create user account if email provided
	if staff.Email != "" && s.authService != nil {
		hashed, _ := s.authService.HashPassword("Teacher@123")
		fullName := staff.FirstName
		if staff.MiddleName != "" {
			fullName += " " + staff.MiddleName
		}
		fullName += " " + staff.LastName
		user := models.User{
			SchoolID:     &schoolUUID,
			Email:        staff.Email,
			FullName:     fullName,
			Role:         "teacher",
			IsActive:     true,
			PasswordHash: hashed,
		}
		if err := s.db.Create(&user).Error; err == nil {
			staff.UserID = &user.ID
		}
	}

	if err := s.db.Create(staff).Error; err != nil {
		return err
	}

	// Create teacher profile
	teacherProfile := models.TeacherProfile{
		StaffID:  staff.ID,
		SchoolID: staff.SchoolID,
	}
	s.db.Create(&teacherProfile)

	return nil
}

func (s *TeacherService) GetByID(id, schoolID string) (*models.Staff, *models.TeacherProfile, error) {
	idUUID, err := uuid.Parse(id)
	if err != nil {
		return nil, nil, err
	}
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return nil, nil, err
	}

	var staff models.Staff
	if err := s.db.Where("id = ? AND school_id = ? AND role = ?", idUUID, schoolUUID, "Teacher").
		Preload("User").First(&staff).Error; err != nil {
		return nil, nil, err
	}

	var teacherProfile models.TeacherProfile
	s.db.Where("staff_id = ?", idUUID).First(&teacherProfile)

	return &staff, &teacherProfile, nil
}

func (s *TeacherService) Update(id, schoolID string, updates *models.Staff) error {
	idUUID, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return err
	}

	var staff models.Staff
	if err := s.db.Where("id = ? AND school_id = ? AND role = ?", idUUID, schoolUUID, "Teacher").First(&staff).Error; err != nil {
		return err
	}

	updates.ID = staff.ID
	updates.SchoolID = staff.SchoolID
	updates.Role = "Teacher"

	return s.db.Save(updates).Error
}

func (s *TeacherService) Delete(id, schoolID string) error {
	idUUID, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return err
	}

	return s.db.Where("id = ? AND school_id = ? AND role = ?", idUUID, schoolUUID, "Teacher").Delete(&models.Staff{}).Error
}

func (s *TeacherService) GetTeacherProfile(staffID, schoolID string) (*models.TeacherProfile, error) {
	staffUUID, _ := uuid.Parse(staffID)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.GetProfile(staffUUID, schoolUUID)
}

func (s *TeacherService) GetTeacherClasses(teacherID, schoolID string) ([]models.Class, error) {
	teacherUUID, _ := uuid.Parse(teacherID)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.GetClasses(teacherUUID, schoolUUID)
}

func (s *TeacherService) GetTeacherSubjects(teacherID, schoolID string) ([]models.StandardSubject, error) {
	teacherUUID, _ := uuid.Parse(teacherID)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.GetSubjects(teacherUUID, schoolUUID)
}

func (s *TeacherService) GetTeacherStudents(teacherID, schoolID string) ([]models.Student, error) {
	teacherUUID, _ := uuid.Parse(teacherID)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.GetStudents(teacherUUID, schoolUUID)
}

func (s *TeacherService) AssignClassSubject(assignment *models.ClassSubject) error {
	return s.repo.AssignClassSubject(assignment)
}

func (s *TeacherService) RemoveClassSubject(classID, subjectID, schoolID string) error {
	classUUID, _ := uuid.Parse(classID)
	subjectUUID, _ := uuid.Parse(subjectID)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.RemoveClassSubject(classUUID, subjectUUID, schoolUUID)
}

func (s *TeacherService) GetClassSubjects(classID, schoolID string) ([]models.ClassSubject, error) {
	classUUID, _ := uuid.Parse(classID)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.GetClassSubjects(classUUID, schoolUUID)
}

func (s *TeacherService) GetTeacherWorkload(teacherID, schoolID string) (map[string]interface{}, error) {
	teacherUUID, _ := uuid.Parse(teacherID)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.GetWorkload(teacherUUID, schoolUUID)
}

func (s *TeacherService) GetTeacherPerformance(teacherID, schoolID, term, year string) (map[string]interface{}, error) {
	teacherUUID, _ := uuid.Parse(teacherID)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.GetPerformance(teacherUUID, schoolUUID, term, year)
}

func (s *TeacherService) GetTeacherSchedule(teacherID, schoolID, date string) ([]models.Lesson, error) {
	_, err := uuid.Parse(teacherID)
	if err != nil {
		return nil, err
	}
	_, err = uuid.Parse(schoolID)
	if err != nil {
		return nil, err
	}
	
	// Note: This requires lesson repository - should be injected separately
	// For now, return empty slice - handlers should use lesson service directly
	return []models.Lesson{}, nil
}

func (s *TeacherService) GetAllTeachers(schoolID string) ([]models.Staff, error) {
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.GetAll(schoolUUID)
}

func (s *TeacherService) GetTeacherStats(schoolID string) (map[string]interface{}, error) {
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.GetStats(schoolUUID)
}

package services

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/config"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type StaffService struct {
	repo         repositories.StaffRepository
	db           *gorm.DB
	authService  *AuthService
	emailService *EmailService
}

func NewStaffService(repo repositories.StaffRepository, db *gorm.DB, cfg *config.Config, emailService *EmailService) *StaffService {
	return &StaffService{
		repo:         repo,
		db:           db,
		authService:  NewAuthService(db, cfg),
		emailService: emailService,
	}
}

func (s *StaffService) CheckEmailExists(email, schoolID string) error {
	var existingUser models.User
	if err := s.db.Unscoped().Where("email = ?", email).First(&existingUser).Error; err == nil {
		return fmt.Errorf("email already exists in users table")
	}
	var existingStaff models.Staff
	if err := s.db.Unscoped().Where("email = ? AND school_id = ?", email, schoolID).First(&existingStaff).Error; err == nil {
		return fmt.Errorf("email already exists in staff records")
	}
	return nil
}

func (s *StaffService) CreateStaff(staff *models.Staff, schoolID string) error {
	if staff.Email != "" {
		if err := s.CheckEmailExists(staff.Email, schoolID); err != nil {
			return err
		}
	}

	var school models.School
	if err := s.db.First(&school, "id = ?", schoolID).Error; err != nil {
		return fmt.Errorf("school not found")
	}

	// Check if school is active
	if !school.IsActive {
		return fmt.Errorf("cannot create staff for inactive schools. Please activate the school first")
	}

	var schoolInitials string
	for _, word := range strings.Fields(school.Name) {
		if len(word) > 0 {
			schoolInitials += strings.ToUpper(string(word[0]))
		}
	}
	if schoolInitials == "" {
		schoolInitials = "SCH"
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		var lastStaff models.Staff
		var sequence int = 0
		currentYear := time.Now().Year()
		pattern := fmt.Sprintf("%s/STF/%d/%%", schoolInitials, currentYear)
		if err := tx.Unscoped().Where("school_id = ? AND employee_id LIKE ? AND deleted_at IS NULL", schoolID, pattern).
			Order("employee_id DESC").First(&lastStaff).Error; err == nil {
			parts := strings.Split(lastStaff.EmployeeID, "/")
			if len(parts) == 4 {
				var num int
				if _, scanErr := fmt.Sscanf(parts[3], "%d", &num); scanErr == nil {
					sequence = num
				}
			}
		}

		for attempts := 0; attempts < 100; attempts++ {
			sequence++
			staff.EmployeeID = fmt.Sprintf("%s/STF/%d/%03d", schoolInitials, currentYear, sequence)

			var existingStaff models.Staff
			if err := tx.Unscoped().Where("school_id = ? AND employee_id = ?", schoolID, staff.EmployeeID).First(&existingStaff).Error; err != nil {
				break
			}
		}

		if sequence >= 100 {
			return fmt.Errorf("failed to generate unique employee ID")
		}

		staff.SchoolID = uuid.MustParse(schoolID)
		staff.Status = "active"

		if err := tx.Create(staff).Error; err != nil {
			return err
		}

		var defaultPassword string
		if staff.Email != "" {
			userRole, password := s.mapStaffRoleToUser(staff.Role)
			defaultPassword = password

			if userRole != "" && defaultPassword != "" {
				hashed, err := s.authService.HashPassword(defaultPassword)
				if err != nil {
					return fmt.Errorf("failed to hash password")
				}

				schoolIDPtr := uuid.MustParse(schoolID)
				fullName := staff.FirstName
				if staff.MiddleName != "" {
					fullName += " " + staff.MiddleName
				}
				fullName += " " + staff.LastName

				user := models.User{
					SchoolID:     &schoolIDPtr,
					Email:        staff.Email,
					FullName:     fullName,
					Role:         userRole,
					IsActive:     true,
					PasswordHash: hashed,
				}
				if err := tx.Create(&user).Error; err != nil {
					return err
				}
				staff.UserID = &user.ID
				if err := tx.Save(staff).Error; err != nil {
					return err
				}
			}
		}

		if staff.Role == "Teacher" {
			teacherProfile := models.TeacherProfile{
				StaffID:  staff.ID,
				SchoolID: staff.SchoolID,
			}
			if err := tx.Create(&teacherProfile).Error; err != nil {
				return err
			}
		}

		if staff.UserID != nil && staff.Email != "" {
			go s.sendWelcomeEmail(staff, school.Name, defaultPassword)
		}

		return nil
	})
}

func (s *StaffService) GetAllStaff(schoolID, role, department, status, search string) ([]models.Staff, error) {
	query := s.db.Where("school_id = ?", schoolID)

	if role != "" {
		query = query.Where("role = ?", role)
	}
	if department != "" {
		query = query.Where("department = ?", department)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	} else {
		query = query.Where("status = ?", "active")
	}
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where(
			"LOWER(first_name) LIKE ? OR LOWER(middle_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(employee_id) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	var staff []models.Staff
	err := query.Preload("User").Find(&staff).Error
	return staff, err
}

func (s *StaffService) GetStaffByID(staffID, schoolID string) (*models.Staff, error) {
	var staff models.Staff
	err := s.db.Where("id = ? AND school_id = ?", staffID, schoolID).Preload("User").First(&staff).Error
	return &staff, err
}

func (s *StaffService) UpdateStaff(staffID, schoolID string, updates *models.Staff) error {
	var staff models.Staff
	if err := s.db.Where("id = ? AND school_id = ?", staffID, schoolID).First(&staff).Error; err != nil {
		return fmt.Errorf("staff not found")
	}

	if staff.Role == "School Admin" {
		return fmt.Errorf("cannot modify School Admin role")
	}

	if staff.UserID != nil {
		fullName := updates.FirstName
		if updates.MiddleName != "" {
			fullName += " " + updates.MiddleName
		}
		fullName += " " + updates.LastName

		userRole, _ := s.mapStaffRoleToUser(updates.Role)

		var currentUser models.User
		if err := s.db.First(&currentUser, "id = ?", staff.UserID).Error; err == nil {
			if userRole != "" && currentUser.Role != userRole {
				// roleChanged = true
			}
		}

		userUpdates := map[string]interface{}{
			"full_name": fullName,
			"email":     updates.Email,
			"is_active": (updates.Status == "active"),
		}

		if userRole != "" {
			userUpdates["role"] = userRole
		}

		s.db.Model(&models.User{}).Where("id = ?", staff.UserID).Updates(userUpdates)
	}

	return s.db.Model(&staff).Updates(updates).Error
}

func (s *StaffService) DeleteStaff(staffID, schoolID string) error {
	var staff models.Staff
	if err := s.db.Where("id = ? AND school_id = ?", staffID, schoolID).First(&staff).Error; err != nil {
		return fmt.Errorf("staff not found")
	}

	if staff.Role == "School Admin" {
		return fmt.Errorf("cannot delete School Admin")
	}

	return s.db.Where("id = ? AND school_id = ?", staffID, schoolID).Delete(&models.Staff{}).Error
}

func (s *StaffService) CreateLeaveRequest(leave *models.StaffLeave, schoolID string) error {
	leave.SchoolID = uuid.MustParse(schoolID)
	leave.Status = "pending"
	return s.db.Create(leave).Error
}

func (s *StaffService) GetLeaveRequests(schoolID, staffID, status string) ([]models.StaffLeave, error) {
	query := s.db.Where("school_id = ?", schoolID)

	if staffID != "" {
		query = query.Where("staff_id = ?", staffID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var leaves []models.StaffLeave
	err := query.Preload("Staff").Preload("Approver").Find(&leaves).Error
	return leaves, err
}

func (s *StaffService) ApproveLeave(leaveID, schoolID, userID, status, rejectionReason string) error {
	var leave models.StaffLeave
	if err := s.db.Where("id = ? AND school_id = ?", leaveID, schoolID).First(&leave).Error; err != nil {
		return fmt.Errorf("leave request not found")
	}

	approverID := uuid.MustParse(userID)
	now := time.Now()

	updates := map[string]interface{}{
		"status":      status,
		"approved_by": approverID,
		"approved_at": now,
	}

	if status == "rejected" {
		updates["rejection_reason"] = rejectionReason
	}

	return s.db.Model(&leave).Updates(updates).Error
}

func (s *StaffService) MarkAttendance(attendance *models.StaffAttendance, schoolID, userID string) error {
	attendance.SchoolID = uuid.MustParse(schoolID)
	attendance.MarkedBy = uuid.MustParse(userID)
	return s.db.Create(attendance).Error
}

func (s *StaffService) GetAttendance(schoolID, staffID, startDate, endDate string) ([]models.StaffAttendance, error) {
	query := s.db.Where("school_id = ?", schoolID)

	if staffID != "" {
		query = query.Where("staff_id = ?", staffID)
	}
	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("date <= ?", endDate)
	}

	var attendance []models.StaffAttendance
	err := query.Preload("Staff").Order("date DESC").Find(&attendance).Error
	return attendance, err
}

func (s *StaffService) GetStats(schoolID string) (map[string]interface{}, error) {
	var totalStaff, activeStaff, onLeave int64
	s.db.Model(&models.Staff{}).Where("school_id = ?", schoolID).Count(&totalStaff)
	s.db.Model(&models.Staff{}).Where("school_id = ? AND status = ?", schoolID, "active").Count(&activeStaff)
	s.db.Model(&models.Staff{}).Where("school_id = ? AND status = ?", schoolID, "on_leave").Count(&onLeave)

	var roleStats []struct {
		Role  string
		Count int64
	}
	s.db.Model(&models.Staff{}).Select("role, COUNT(*) as count").
		Where("school_id = ? AND status = ?", schoolID, "active").
		Group("role").Scan(&roleStats)

	byRole := make(map[string]int64)
	for _, rs := range roleStats {
		byRole[rs.Role] = rs.Count
	}

	return map[string]interface{}{
		"total_staff":  totalStaff,
		"active_staff": activeStaff,
		"on_leave":     onLeave,
		"by_role":      byRole,
	}, nil
}

func (s *StaffService) MarkStaffAttendance(attendance *models.StaffAttendance) error {
	return s.db.Create(attendance).Error
}

func (s *StaffService) GetStaffAttendance(schoolID, staffID, startDate, endDate string) ([]models.StaffAttendance, error) {
	query := s.db.Where("school_id = ?", schoolID)

	if staffID != "" {
		query = query.Where("staff_id = ?", staffID)
	}
	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("date <= ?", endDate)
	}

	var attendance []models.StaffAttendance
	err := query.Preload("Staff").Order("date DESC").Find(&attendance).Error
	return attendance, err
}

func (s *StaffService) UploadStaffDocument(document *models.StaffDocument) error {
	return s.db.Create(document).Error
}

func (s *StaffService) GetStaffDocuments(staffID, schoolID string) ([]models.StaffDocument, error) {
	var documents []models.StaffDocument
	err := s.db.Where("staff_id = ? AND school_id = ?", staffID, schoolID).Find(&documents).Error
	return documents, err
}

func (s *StaffService) GetStaffStats(schoolID string) (map[string]interface{}, error) {
	var stats struct {
		TotalStaff       int64
		ActiveStaff      int64
		OnLeave          int64
		ByRole           map[string]int64
		ByDepartment     map[string]int64
		ByEmploymentType map[string]int64
	}

	s.db.Model(&models.Staff{}).Where("school_id = ?", schoolID).Count(&stats.TotalStaff)
	s.db.Model(&models.Staff{}).Where("school_id = ? AND status = ?", schoolID, "active").Count(&stats.ActiveStaff)
	s.db.Model(&models.Staff{}).Where("school_id = ? AND status = ?", schoolID, "on_leave").Count(&stats.OnLeave)

	var roleStats []struct {
		Role  string
		Count int64
	}
	s.db.Model(&models.Staff{}).Select("role, COUNT(*) as count").
		Where("school_id = ? AND status = ?", schoolID, "active").
		Group("role").Scan(&roleStats)

	stats.ByRole = make(map[string]int64)
	for _, rs := range roleStats {
		stats.ByRole[rs.Role] = rs.Count
	}

	var deptStats []struct {
		Department string
		Count      int64
	}
	s.db.Model(&models.Staff{}).Select("department, COUNT(*) as count").
		Where("school_id = ? AND status = ? AND department IS NOT NULL", schoolID, "active").
		Group("department").Scan(&deptStats)

	stats.ByDepartment = make(map[string]int64)
	for _, ds := range deptStats {
		stats.ByDepartment[ds.Department] = ds.Count
	}

	var empStats []struct {
		EmploymentType string
		Count          int64
	}
	s.db.Model(&models.Staff{}).Select("employment_type, COUNT(*) as count").
		Where("school_id = ? AND status = ?", schoolID, "active").
		Group("employment_type").Scan(&empStats)

	stats.ByEmploymentType = make(map[string]int64)
	for _, es := range empStats {
		stats.ByEmploymentType[es.EmploymentType] = es.Count
	}

	return map[string]interface{}{
		"total_staff":        stats.TotalStaff,
		"active_staff":       stats.ActiveStaff,
		"on_leave":           stats.OnLeave,
		"by_role":            stats.ByRole,
		"by_department":      stats.ByDepartment,
		"by_employment_type": stats.ByEmploymentType,
	}, nil
}

func (s *StaffService) mapStaffRoleToUser(role string) (string, string) {
	switch role {
	case "Teacher":
		return "teacher", "Teacher@123"
	case "Director of Studies":
		return "director_of_studies", "DOS@123"
	case "Bursar":
		return "bursar", "Bursar@123"
	case "Librarian":
		return "librarian", "Librarian@123"
	case "Nurse":
		return "nurse", "Nurse@123"
	case "Store Keeper":
		return "store_keeper", "StoreKeeper@123"
	default:
		return "", ""
	}
}

func (s *StaffService) sendWelcomeEmail(staff *models.Staff, schoolName, password string) {
	if s.emailService == nil {
		return
	}

	fullName := staff.FirstName + " " + staff.LastName
	if err := s.emailService.SendWelcomeEmail(staff.Email, fullName, staff.Role, schoolName, password); err != nil {
		log.Printf("Failed to send welcome email to %s: %v", staff.Email, err)
	}
}

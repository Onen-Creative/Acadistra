package services

import (
	"fmt"
	"time"

	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type SchoolService struct {
	repo repositories.SchoolRepository
	db   *gorm.DB
}

func NewSchoolService(repo repositories.SchoolRepository, db *gorm.DB) *SchoolService {
	return &SchoolService{repo: repo, db: db}
}

// GetDB returns the database instance
func (s *SchoolService) GetDB() *gorm.DB {
	return s.db
}

func (s *SchoolService) Create(school *models.School) error {
	return s.repo.Create(school)
}

func (s *SchoolService) Update(school *models.School) error {
	return s.repo.Update(school)
}

func (s *SchoolService) Delete(id uint) error {
	return s.repo.Delete(id)
}

func (s *SchoolService) FindByID(id uint) (*models.School, error) {
	return s.repo.FindByID(id)
}

func (s *SchoolService) FindBySubdomain(subdomain string) (*models.School, error) {
	return s.repo.FindBySubdomain(subdomain)
}

func (s *SchoolService) FindAll() ([]models.School, error) {
	return s.repo.FindAll()
}

func (s *SchoolService) Count() (int64, error) {
	return s.repo.Count()
}

func (s *SchoolService) List(page, limit int, search string) ([]models.School, int64, error) {
	offset := (page - 1) * limit
	query := s.db.Model(&models.School{})
	if search != "" {
		query = query.Where("name LIKE ? OR address LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	var total int64
	query.Count(&total)
	var schools []models.School
	err := query.Offset(offset).Limit(limit).Find(&schools).Error
	return schools, total, err
}

type SchoolDetails struct {
	models.School
	UserCount    int64 `json:"user_count"`
	StaffCount   int64 `json:"staff_count"`
	StudentCount int64 `json:"student_count"`
}

func (s *SchoolService) GetDetails(id string) (*SchoolDetails, error) {
	var school models.School
	if err := s.db.First(&school, "id = ?", id).Error; err != nil {
		return nil, err
	}
	details := &SchoolDetails{School: school}
	s.db.Model(&models.User{}).Where("school_id = ? AND deleted_at IS NULL", id).Count(&details.UserCount)
	s.db.Model(&models.Staff{}).Where("school_id = ? AND status = ?", id, "active").Count(&details.StaffCount)
	s.db.Model(&models.Student{}).Where("school_id = ? AND status = ? AND deleted_at IS NULL", id, "active").Count(&details.StudentCount)
	return details, nil
}

func (s *SchoolService) ToggleActive(id string) (*models.School, error) {
	var school models.School
	if err := s.db.First(&school, "id = ?", id).Error; err != nil {
		return nil, err
	}
	newStatus := !school.IsActive
	if err := s.db.Model(&school).Update("is_active", newStatus).Error; err != nil {
		return nil, err
	}
	school.IsActive = newStatus
	return &school, nil
}

type SchoolSummary struct {
	TotalStudents  int64   `json:"total_students"`
	TotalTeachers  int64   `json:"total_teachers"`
	TotalClasses   int64   `json:"total_classes"`
	AttendanceRate float64 `json:"attendance_rate"`
	TotalIncome    float64 `json:"total_income"`
	TotalBooks     int64   `json:"total_books"`
	ClinicVisits   int64   `json:"clinic_visits"`
	InventoryItems int64   `json:"inventory_items"`
}

func (s *SchoolService) GetSummary(schoolID, term string, year int, period string) (*SchoolSummary, error) {
	summary := &SchoolSummary{}
	s.db.Model(&models.Class{}).Where("school_id = ? AND term = ? AND year = ?", schoolID, term, year).Count(&summary.TotalClasses)
	s.db.Table("students").Select("COUNT(DISTINCT students.id)").
		Joins("INNER JOIN enrollments ON students.id = enrollments.student_id AND enrollments.status = 'active'").
		Joins("INNER JOIN classes ON enrollments.class_id = classes.id").
		Where("students.school_id = ? AND students.status = 'active'", schoolID).
		Where("classes.term = ? AND classes.year = ?", term, year).Scan(&summary.TotalStudents)
	s.db.Model(&models.Staff{}).Where("school_id = ? AND role = ? AND status = ?", schoolID, "Teacher", "active").Count(&summary.TotalTeachers)
	var totalAttendance, presentCount int64
	if period == "today" {
		today := time.Now().Format("2006-01-02")
		s.db.Model(&models.Attendance{}).Where("school_id = ? AND date::date = ?::date", schoolID, today).Count(&totalAttendance)
		s.db.Model(&models.Attendance{}).Where("school_id = ? AND date::date = ?::date AND status = 'present'", schoolID, today).Count(&presentCount)
	} else {
		s.db.Model(&models.Attendance{}).Where("school_id = ? AND term = ? AND year = ?", schoolID, term, year).Select("COUNT(DISTINCT CONCAT(student_id, '-', date))").Scan(&totalAttendance)
		s.db.Model(&models.Attendance{}).Where("school_id = ? AND term = ? AND year = ? AND status = 'present'", schoolID, term, year).Select("COUNT(DISTINCT CONCAT(student_id, '-', date))").Scan(&presentCount)
	}
	if totalAttendance > 0 {
		summary.AttendanceRate = float64(presentCount) / float64(totalAttendance) * 100
	}
	s.db.Model(&models.Income{}).Where("school_id = ? AND term = ? AND year = ?", schoolID, term, year).Select("COALESCE(SUM(amount), 0)").Scan(&summary.TotalIncome)
	s.db.Model(&models.Book{}).Where("school_id = ?", schoolID).Count(&summary.TotalBooks)
	s.db.Model(&models.ClinicVisit{}).Where("school_id = ? AND term = ? AND year = ?", schoolID, term, year).Count(&summary.ClinicVisits)
	s.db.Table("inventory_items").Where("school_id = ?", schoolID).Count(&summary.InventoryItems)
	return summary, nil
}

type Stats struct {
	SchoolsByType    map[string]int64 `json:"schools_by_type"`
	UsersByRole      map[string]int64 `json:"users_by_role"`
	UsersBySchool    []struct {
		SchoolName string `json:"school_name"`
		UserCount  int64  `json:"user_count"`
	} `json:"users_by_school"`
	TotalStudents    int64 `json:"total_students"`
	TotalSchools     int64 `json:"total_schools"`
	TotalUsers       int64 `json:"total_users"`
	StudentsBySchool []struct {
		SchoolName   string `json:"school_name"`
		StudentCount int64  `json:"student_count"`
	} `json:"students_by_school"`
	Health struct {
		Database string  `json:"database"`
		Status   string  `json:"status"`
		Uptime   float64 `json:"uptime_percent"`
	} `json:"health"`
}

func (s *SchoolService) GetStats() (*Stats, error) {
	stats := &Stats{SchoolsByType: make(map[string]int64), UsersByRole: make(map[string]int64)}
	if sqlDB, err := s.db.DB(); err == nil {
		if err := sqlDB.Ping(); err == nil {
			stats.Health.Database = "connected"
			stats.Health.Status = "healthy"
			stats.Health.Uptime = 99.9
		} else {
			stats.Health.Database = "error"
			stats.Health.Status = "degraded"
		}
	} else {
		stats.Health.Database = "error"
		stats.Health.Status = "down"
	}
	var schoolTypeResults []struct {
		Type  string
		Count int64
	}
	s.db.Model(&models.School{}).Select("type, COUNT(*) as count").Group("type").Scan(&schoolTypeResults)
	for _, result := range schoolTypeResults {
		stats.SchoolsByType[result.Type] = result.Count
	}
	var userRoleResults []struct {
		Role  string
		Count int64
	}
	s.db.Model(&models.User{}).Select("role, COUNT(*) as count").Group("role").Scan(&userRoleResults)
	for _, result := range userRoleResults {
		stats.UsersByRole[result.Role] = result.Count
	}
	s.db.Model(&models.School{}).Select("schools.name as school_name, COUNT(DISTINCT users.id) as user_count").
		Joins("LEFT JOIN users ON schools.id = users.school_id AND users.deleted_at IS NULL").
		Group("schools.id, schools.name").Scan(&stats.UsersBySchool)
	s.db.Model(&models.School{}).Select("schools.name as school_name, COUNT(DISTINCT students.id) as student_count").
		Joins("LEFT JOIN students ON schools.id = students.school_id AND students.deleted_at IS NULL AND students.status = 'active'").
		Group("schools.id, schools.name").Scan(&stats.StudentsBySchool)
	s.db.Model(&models.School{}).Count(&stats.TotalSchools)
	s.db.Model(&models.User{}).Where("deleted_at IS NULL").Count(&stats.TotalUsers)
	s.db.Model(&models.Student{}).Where("deleted_at IS NULL AND status = 'active'").Count(&stats.TotalStudents)
	return stats, nil
}

func (s *SchoolService) GetLevels(schoolID string) ([]string, error) {
	var school models.School
	if err := s.db.First(&school, "id = ?", schoolID).Error; err != nil {
		return nil, err
	}
	levels := []string{}
	if school.Config != nil {
		if configLevels, ok := school.Config["levels"].([]interface{}); ok {
			for _, lvl := range configLevels {
				if level, ok := lvl.(string); ok {
					levels = append(levels, level)
				}
			}
		}
	}
	if len(levels) == 0 && school.Type != "" {
		levels = s.getLevelsByType(school.Type)
		if len(levels) > 0 {
			if school.Config == nil {
				school.Config = make(models.JSONB)
			}
			school.Config["levels"] = levels
			s.db.Save(&school)
		}
	}
	if levels == nil {
		levels = []string{}
	}
	return levels, nil
}

func (s *SchoolService) getLevelsByType(schoolType string) []string {
	switch schoolType {
	case "nursery":
		return []string{"Baby", "Middle", "Top"}
	case "primary":
		return []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7"}
	case "ordinary":
		return []string{"S1", "S2", "S3", "S4"}
	case "advanced":
		return []string{"S5", "S6"}
	case "nursery_primary":
		return []string{"Baby", "Middle", "Top", "P1", "P2", "P3", "P4", "P5", "P6", "P7"}
	case "nursery_primary_ordinary":
		return []string{"Baby", "Middle", "Top", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4"}
	case "nursery_primary_ordinary_advanced":
		return []string{"Baby", "Middle", "Top", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4", "S5", "S6"}
	case "ordinary_advanced":
		return []string{"S1", "S2", "S3", "S4", "S5", "S6"}
	case "primary_ordinary":
		return []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4"}
	case "primary_ordinary_advanced":
		return []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4", "S5", "S6"}
	default:
		return []string{}
	}
}

func (s *SchoolService) CreateWithLevels(name, schoolType, address, country, region, contactEmail, phone, logoURL, motto string) (*models.School, error) {
	levels := s.getLevelsByType(schoolType)
	if len(levels) == 0 {
		return nil, fmt.Errorf("invalid school type")
	}
	var academicLevels []string
	switch schoolType {
	case "nursery":
		academicLevels = []string{"nursery"}
	case "primary":
		academicLevels = []string{"primary"}
	case "ordinary":
		academicLevels = []string{"ordinary"}
	case "advanced":
		academicLevels = []string{"advanced"}
	case "nursery_primary":
		academicLevels = []string{"nursery", "primary"}
	case "nursery_primary_ordinary":
		academicLevels = []string{"nursery", "primary", "ordinary"}
	case "nursery_primary_ordinary_advanced":
		academicLevels = []string{"nursery", "primary", "ordinary", "advanced"}
	case "ordinary_advanced":
		academicLevels = []string{"ordinary", "advanced"}
	case "primary_ordinary":
		academicLevels = []string{"primary", "ordinary"}
	case "primary_ordinary_advanced":
		academicLevels = []string{"primary", "ordinary", "advanced"}
	}
	school := &models.School{
		Name:         name,
		Type:         schoolType,
		Address:      address,
		Country:      country,
		Region:       region,
		ContactEmail: contactEmail,
		Phone:        phone,
		LogoURL:      logoURL,
		Motto:        motto,
		IsActive:     true,
		Config:       models.JSONB{"academic_levels": academicLevels, "levels": levels},
	}
	if err := s.db.Create(school).Error; err != nil {
		return nil, err
	}
	return school, nil
}

func (s *SchoolService) UpdateWithConfig(id string, name, schoolType, address, country, region, contactEmail, phone, logoURL, motto string, config models.JSONB) (*models.School, error) {
	var school models.School
	if err := s.db.First(&school, "id = ?", id).Error; err != nil {
		return nil, err
	}
	school.Name = name
	if schoolType != "" {
		school.Type = schoolType
	}
	school.Address = address
	school.Country = country
	school.Region = region
	school.ContactEmail = contactEmail
	school.Phone = phone
	school.LogoURL = logoURL
	school.Motto = motto
	if config != nil {
		school.Config = config
	}
	if err := s.db.Save(&school).Error; err != nil {
		return nil, err
	}
	return &school, nil
}

package services

import (
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type ClassService struct {
	repo repositories.ClassRepository
	db   *gorm.DB
}

func NewClassService(repo repositories.ClassRepository, db *gorm.DB) *ClassService {
	return &ClassService{repo: repo, db: db}
}

// ClassWithCount wraps a class with its active student count.
type ClassWithCount struct {
	models.Class
	StudentCount int64 `json:"student_count"`
}

func (s *ClassService) List(schoolID, year, term, level string) ([]ClassWithCount, error) {
	classes, err := s.repo.FindByFilters(schoolID, year, term, level)
	if err != nil {
		return nil, err
	}
	result := make([]ClassWithCount, len(classes))
	for i, class := range classes {
		count, _ := s.repo.CountActiveEnrollments(class.ID.String())
		result[i] = ClassWithCount{Class: class, StudentCount: count}
	}
	return result, nil
}

func (s *ClassService) Get(id string) (*models.Class, error) {
	var class models.Class
	if err := s.db.Preload("TeacherProfile").Preload("TeacherProfile.Staff").Preload("School").
		First(&class, "id = ?", id).Error; err != nil {
		return nil, errors.New("class not found")
	}
	return &class, nil
}

func (s *ClassService) Create(class *models.Class, userRole, tenantSchoolID string) error {
	if userRole != "system_admin" {
		if tenantSchoolID == "" {
			return errors.New("no school assigned to user")
		}
		schoolID, err := uuid.Parse(tenantSchoolID)
		if err != nil {
			return errors.New("invalid school ID")
		}
		class.SchoolID = schoolID
	}

	// Validate teacher if provided
	if class.TeacherProfileID != nil && *class.TeacherProfileID != uuid.Nil {
		var tp models.TeacherProfile
		if err := s.db.First(&tp, "id = ? AND school_id = ?", *class.TeacherProfileID, class.SchoolID).Error; err != nil {
			class.TeacherProfileID = nil
		}
	} else {
		class.TeacherProfileID = nil
	}

	class.Name = buildClassName(class.Level, class.Stream)

	// Check duplicate
	if _, err := s.repo.FindDuplicate(class.SchoolID, class.Level, class.Stream, fmt.Sprint(class.Year), class.Term); err == nil {
		return errors.New("class with this level and stream already exists for this term/year")
	}

	return s.repo.Create(class)
}

func (s *ClassService) Update(id string, updates *models.Class, userRole, tenantSchoolID string) (*models.Class, error) {
	var class models.Class
	if err := s.db.First(&class, "id = ?", id).Error; err != nil {
		return nil, errors.New("class not found")
	}

	if userRole != "system_admin" {
		if tenantSchoolID == "" || class.SchoolID.String() != tenantSchoolID {
			return nil, errors.New("access denied")
		}
	}

	updates.SchoolID = class.SchoolID

	if updates.TeacherProfileID != nil && *updates.TeacherProfileID != uuid.Nil {
		var tp models.TeacherProfile
		if err := s.db.First(&tp, "id = ? AND school_id = ?", *updates.TeacherProfileID, class.SchoolID).Error; err != nil {
			updates.TeacherProfileID = nil
		}
	} else if updates.TeacherProfileID != nil && *updates.TeacherProfileID == uuid.Nil {
		updates.TeacherProfileID = nil
	}

	updates.Name = buildClassName(updates.Level, updates.Stream)

	if err := s.db.Model(&class).Updates(updates).Error; err != nil {
		return nil, err
	}
	return &class, nil
}

func (s *ClassService) Delete(id string, userRole, tenantSchoolID string) error {
	var class models.Class
	if err := s.db.First(&class, "id = ?", id).Error; err != nil {
		return errors.New("class not found")
	}

	if userRole != "system_admin" {
		if tenantSchoolID == "" || class.SchoolID.String() != tenantSchoolID {
			return errors.New("access denied")
		}
	}

	count, err := s.repo.CountActiveEnrollments(id)
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("cannot delete class with active enrollments")
	}

	return s.db.Delete(&class).Error
}

func (s *ClassService) GetStudents(classID, year, term string) ([]models.Student, error) {
	query := s.db.Preload("Student").Where("class_id = ? AND status = ?", classID, "active")
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if term != "" {
		query = query.Where("term = ?", term)
	}
	var enrollments []models.Enrollment
	if err := query.Find(&enrollments).Error; err != nil {
		return nil, err
	}
	students := make([]models.Student, len(enrollments))
	for i, e := range enrollments {
		students[i] = *e.Student
	}
	return students, nil
}

func (s *ClassService) GetLevels(schoolID string) ([]string, error) {
	var school models.School
	if err := s.db.First(&school, "id = ?", schoolID).Error; err != nil {
		return nil, errors.New("school not found")
	}
	levels := []string{}
	if academicLevels, ok := school.Config["academic_levels"].([]interface{}); ok {
		for _, level := range academicLevels {
			if levelStr, ok := level.(string); ok {
				levels = append(levels, levelStr)
			}
		}
	}
	return levels, nil
}

func (s *ClassService) GetTeacherClasses(schoolID, teacherName string) ([]models.Class, error) {
	return s.repo.FindByTeacherName(schoolID, teacherName)
}

func buildClassName(level, stream string) string {
	if stream != "" {
		return level + " " + stream
	}
	return level
}

// Keep original simple methods for backward compatibility
func (s *ClassService) FindByID(id uuid.UUID) (*models.Class, error) {
	var class models.Class
	err := s.repo.FindByID(id, &class)
	return &class, err
}

func (s *ClassService) FindBySchoolID(schoolID uuid.UUID) ([]models.Class, error) {
	return s.repo.FindBySchoolID(schoolID)
}

func (s *ClassService) FindByYearAndTerm(schoolID uuid.UUID, year int, term string) ([]models.Class, error) {
	return s.repo.FindByYearAndTerm(schoolID, year, term)
}

func (s *ClassService) UpdateTeacher(classID, teacherID uuid.UUID) error {
	return s.repo.UpdateTeacher(classID, teacherID)
}

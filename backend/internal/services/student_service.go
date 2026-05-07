package services

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type StudentService struct {
	repo repositories.StudentRepository
	db   *gorm.DB
}

func NewStudentService(repo repositories.StudentRepository, db *gorm.DB) *StudentService {
	return &StudentService{repo: repo, db: db}
}

// StudentListResult holds paginated student results.
type StudentListResult struct {
	Students   []models.Student `json:"students"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
	TotalPages int              `json:"total_pages"`
	ShowingAll bool             `json:"showing_all"`
}

// List returns students with filters, pagination, and enriched data.
func (s *StudentService) List(schoolID string, params StudentListParams) (*StudentListResult, error) {
	sid, err := uuid.Parse(schoolID)
	if err != nil {
		return nil, err
	}

	limit := params.Limit
	if limit == 0 {
		limit = 200
	}
	if limit > 2000 {
		limit = 2000
	}

	filter := repositories.StudentListFilter{
		SchoolID: sid,
		Level:    params.Level,
		ClassID:  params.ClassID,
		Year:     params.Year,
		Term:     params.Term,
		Search:   params.Search,
		Gender:   params.Gender,
		Page:     params.Page,
		Limit:    limit,
	}
	if params.Limit == -1 {
		filter.Limit = 0 // no limit
	}

	students, total, err := s.repo.ListWithFilters(filter)
	if err != nil {
		return nil, err
	}

	s.repo.LoadGuardiansAndClass(students, s.db)

	totalPages := 1
	if filter.Limit > 0 {
		totalPages = int((total + int64(filter.Limit) - 1) / int64(filter.Limit))
	}

	return &StudentListResult{
		Students:   students,
		Total:      total,
		Page:       params.Page,
		Limit:      filter.Limit,
		TotalPages: totalPages,
		ShowingAll: filter.Limit == 0,
	}, nil
}

// GetMyChildren returns students linked to a parent's phone number.
func (s *StudentService) GetMyChildren(guardianPhone, schoolID string) ([]models.Student, error) {
	phoneVariants := buildPhoneVariants(guardianPhone)

	var guardians []models.Guardian
	if err := s.db.Where("(phone IN ? OR alternative_phone IN ?) AND school_id = ?", phoneVariants, phoneVariants, schoolID).
		Find(&guardians).Error; err != nil {
		return nil, err
	}

	if len(guardians) == 0 {
		return []models.Student{}, nil
	}

	studentIDs := make([]uuid.UUID, len(guardians))
	for i, g := range guardians {
		studentIDs[i] = g.StudentID
	}

	students, err := s.repo.FindByIDs(studentIDs, uuid.MustParse(schoolID))
	if err != nil {
		return nil, err
	}

	s.repo.LoadGuardiansAndClass(students, s.db)
	return students, nil
}

func buildPhoneVariants(phone string) []string {
	variants := []string{phone}
	if strings.HasPrefix(phone, "+256") {
		variants = append(variants, "0"+phone[4:])
	} else if strings.HasPrefix(phone, "0") {
		variants = append(variants, "+256"+phone[1:])
	}
	return variants
}

// StudentListParams holds query parameters for listing students.
type StudentListParams struct {
	Level   string
	ClassID string
	Year    string
	Term    string
	Search  string
	Gender  string
	Page    int
	Limit   int // -1 = no limit
}

func (s *StudentService) GetByID(studentID, schoolID string) (*models.Student, error) {
	sid, err := uuid.Parse(studentID)
	if err != nil {
		return nil, err
	}
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return nil, err
	}

	var student models.Student
	if err := s.db.Preload("Guardians").Preload("Enrollments.Class").
		Where("id = ? AND school_id = ?", sid, schoolUUID).
		First(&student).Error; err != nil {
		return nil, err
	}
	return &student, nil
}

func (s *StudentService) UpdateStudent(studentID, schoolID string, updates map[string]interface{}) (*models.Student, error) {
	sid, err := uuid.Parse(studentID)
	if err != nil {
		return nil, err
	}
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return nil, err
	}

	var student models.Student
	if err := s.db.Where("id = ? AND school_id = ?", sid, schoolUUID).First(&student).Error; err != nil {
		return nil, err
	}

	if err := s.db.Model(&student).Updates(updates).Error; err != nil {
		return nil, err
	}

	return &student, nil
}

func (s *StudentService) DeleteStudent(studentID, schoolID string) error {
	sid, err := uuid.Parse(studentID)
	if err != nil {
		return err
	}
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return err
	}

	var student models.Student
	if err := s.db.Where("id = ? AND school_id = ?", sid, schoolUUID).First(&student).Error; err != nil {
		return err
	}

	return s.db.Delete(&student).Error
}

func (s *StudentService) PromoteOrDemote(studentID, schoolID, newClassID string, year int, term string) (*models.Enrollment, error) {
	sid, err := uuid.Parse(studentID)
	if err != nil {
		return nil, err
	}
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return nil, err
	}
	classUUID, err := uuid.Parse(newClassID)
	if err != nil {
		return nil, err
	}

	// Verify student exists
	var student models.Student
	if err := s.db.Where("id = ? AND school_id = ?", sid, schoolUUID).First(&student).Error; err != nil {
		return nil, err
	}

	// Verify new class exists
	var newClass models.Class
	if err := s.db.Where("id = ? AND school_id = ?", classUUID, schoolUUID).First(&newClass).Error; err != nil {
		return nil, err
	}

	// Deactivate current enrollment
	s.db.Model(&models.Enrollment{}).Where("student_id = ? AND status = 'active'", sid).Update("status", "completed")

	// Create new enrollment
	newEnrollment := models.Enrollment{
		StudentID:  sid,
		ClassID:    classUUID,
		Year:       year,
		Term:       term,
		Status:     "active",
		EnrolledOn: time.Now(),
	}

	if err := s.db.Create(&newEnrollment).Error; err != nil {
		return nil, err
	}

	return &newEnrollment, nil
}

// Keep original simple methods for backward compatibility
func (s *StudentService) Create(student *models.Student) error {
	return s.repo.Create(student)
}

func (s *StudentService) Update(student interface{}) error {
	return s.repo.Update(student)
}

func (s *StudentService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *StudentService) FindByID(id uuid.UUID) (*models.Student, error) {
	var student models.Student
	err := s.repo.FindByID(id, &student)
	return &student, err
}

func (s *StudentService) FindBySchoolID(schoolID uuid.UUID, page, limit int) ([]models.Student, int64, error) {
	return s.repo.FindBySchoolID(schoolID, page, limit)
}

func (s *StudentService) FindByClassID(classID uuid.UUID) ([]models.Student, error) {
	return s.repo.FindByClassID(classID)
}

func (s *StudentService) FindByAdmissionNo(admissionNo string, schoolID uuid.UUID) (*models.Student, error) {
	return s.repo.FindByAdmissionNo(admissionNo, schoolID)
}

func (s *StudentService) Search(schoolID uuid.UUID, query string, page, limit int) ([]models.Student, int64, error) {
	return s.repo.Search(schoolID, query, page, limit)
}

func (s *StudentService) CountBySchoolID(schoolID uuid.UUID) (int64, error) {
	return s.repo.CountBySchoolID(schoolID)
}

func (s *StudentService) FindWithGuardians(studentID uuid.UUID) (*models.Student, []models.Guardian, error) {
	return s.repo.FindWithGuardians(studentID)
}

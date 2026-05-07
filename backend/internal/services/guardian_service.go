package services

import (
	"errors"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type GuardianService struct {
	repo repositories.GuardianRepository
	db   *gorm.DB
}

func NewGuardianService(repo repositories.GuardianRepository, db *gorm.DB) *GuardianService {
	return &GuardianService{repo: repo, db: db}
}

// CreateGuardianRequest holds the input for creating a guardian.
type CreateGuardianRequest struct {
	StudentID        string `json:"student_id" binding:"required"`
	Relationship     string `json:"relationship" binding:"required"`
	FullName         string `json:"full_name" binding:"required"`
	Phone            string `json:"phone" binding:"required"`
	AlternativePhone string `json:"alternative_phone"`
	Email            string `json:"email"`
	Occupation       string `json:"occupation"`
	Address          string `json:"address"`
	Workplace        string `json:"workplace"`
	WorkAddress      string `json:"work_address"`
	IsPrimaryContact bool   `json:"is_primary_contact"`
	IsEmergency      bool   `json:"is_emergency"`
	IsFeePayer       bool   `json:"is_fee_payer"`
	NationalID       string `json:"national_id"`
}

// UpdateGuardianRequest holds the input for updating a guardian.
type UpdateGuardianRequest struct {
	Relationship     string `json:"relationship"`
	FullName         string `json:"full_name"`
	Phone            string `json:"phone"`
	AlternativePhone string `json:"alternative_phone"`
	Email            string `json:"email"`
	Occupation       string `json:"occupation"`
	Address          string `json:"address"`
	Workplace        string `json:"workplace"`
	WorkAddress      string `json:"work_address"`
	IsPrimaryContact *bool  `json:"is_primary_contact"`
	IsEmergency      *bool  `json:"is_emergency"`
	IsFeePayer       *bool  `json:"is_fee_payer"`
	NationalID       string `json:"national_id"`
}

// CreateWithStudentCheck creates a guardian after verifying student ownership.
func (s *GuardianService) CreateWithStudentCheck(req CreateGuardianRequest, tenantSchoolID string) (*models.Guardian, error) {
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		return nil, errors.New("invalid student ID")
	}

	var student models.Student
	if err := s.db.First(&student, "id = ?", studentID).Error; err != nil {
		return nil, errors.New("student not found")
	}

	if tenantSchoolID != "" && student.SchoolID.String() != tenantSchoolID {
		return nil, errors.New("access denied")
	}

	guardian := &models.Guardian{
		StudentID:        studentID,
		SchoolID:         student.SchoolID,
		Relationship:     req.Relationship,
		FullName:         req.FullName,
		Phone:            req.Phone,
		AlternativePhone: req.AlternativePhone,
		Email:            req.Email,
		Occupation:       req.Occupation,
		Address:          req.Address,
		Workplace:        req.Workplace,
		WorkAddress:      req.WorkAddress,
		IsPrimaryContact: req.IsPrimaryContact,
		IsEmergency:      req.IsEmergency,
		IsFeePayer:       req.IsFeePayer,
		NationalID:       req.NationalID,
	}

	if err := s.db.Create(guardian).Error; err != nil {
		return nil, err
	}
	return guardian, nil
}

// GetByIDAndSchool fetches a guardian scoped to a school.
func (s *GuardianService) GetByIDAndSchool(id, schoolID string) (*models.Guardian, error) {
	query := s.db.Where("id = ?", id)
	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}
	var guardian models.Guardian
	if err := query.First(&guardian).Error; err != nil {
		return nil, errors.New("guardian not found")
	}
	return &guardian, nil
}

// ListBySchool returns guardians filtered by school and optionally student.
func (s *GuardianService) ListBySchool(schoolID, studentID string) ([]models.Guardian, error) {
	query := s.db.Model(&models.Guardian{})
	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}
	if studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	var guardians []models.Guardian
	if err := query.Find(&guardians).Error; err != nil {
		return nil, err
	}
	return guardians, nil
}

// UpdateFields applies partial updates to a guardian.
func (s *GuardianService) UpdateFields(id, schoolID string, req UpdateGuardianRequest) (*models.Guardian, error) {
	guardian, err := s.GetByIDAndSchool(id, schoolID)
	if err != nil {
		return nil, err
	}

	if req.Relationship != "" {
		guardian.Relationship = req.Relationship
	}
	if req.FullName != "" {
		guardian.FullName = req.FullName
	}
	if req.Phone != "" {
		guardian.Phone = req.Phone
	}
	if req.AlternativePhone != "" {
		guardian.AlternativePhone = req.AlternativePhone
	}
	if req.Email != "" {
		guardian.Email = req.Email
	}
	if req.Occupation != "" {
		guardian.Occupation = req.Occupation
	}
	if req.Address != "" {
		guardian.Address = req.Address
	}
	if req.Workplace != "" {
		guardian.Workplace = req.Workplace
	}
	if req.WorkAddress != "" {
		guardian.WorkAddress = req.WorkAddress
	}
	if req.IsPrimaryContact != nil {
		guardian.IsPrimaryContact = *req.IsPrimaryContact
	}
	if req.IsEmergency != nil {
		guardian.IsEmergency = *req.IsEmergency
	}
	if req.IsFeePayer != nil {
		guardian.IsFeePayer = *req.IsFeePayer
	}
	if req.NationalID != "" {
		guardian.NationalID = req.NationalID
	}

	if err := s.db.Save(guardian).Error; err != nil {
		return nil, err
	}
	return guardian, nil
}

// DeleteByIDAndSchool deletes a guardian scoped to a school.
func (s *GuardianService) DeleteByIDAndSchool(id, schoolID string) error {
	query := s.db.Where("id = ?", id)
	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}
	return query.Delete(&models.Guardian{}).Error
}

// Keep original simple methods for backward compatibility
func (s *GuardianService) Create(guardian *models.Guardian) error {
	return s.repo.Create(guardian)
}

func (s *GuardianService) Update(guardian interface{}) error {
	return s.repo.Update(guardian)
}

func (s *GuardianService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *GuardianService) FindByID(id uuid.UUID) (*models.Guardian, error) {
	var guardian models.Guardian
	err := s.repo.FindByID(id, &guardian)
	return &guardian, err
}

func (s *GuardianService) FindByStudentID(studentID uuid.UUID) ([]models.Guardian, error) {
	return s.repo.FindByStudentID(studentID)
}

func (s *GuardianService) FindByPhone(phone string) ([]models.Guardian, error) {
	return s.repo.FindByPhone(phone)
}

func (s *GuardianService) FindByEmail(email string) (*models.Guardian, error) {
	return s.repo.FindByEmail(email)
}

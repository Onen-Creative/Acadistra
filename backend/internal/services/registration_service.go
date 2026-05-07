package services

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type RegistrationService struct {
	repo         repositories.RegistrationRepository
	db           *gorm.DB
	emailService *EmailService
}

func NewRegistrationService(repo repositories.RegistrationRepository, db *gorm.DB, emailService *EmailService) *RegistrationService {
	return &RegistrationService{
		repo:         repo,
		db:           db,
		emailService: emailService,
	}
}

func (s *RegistrationService) GenerateAdmissionNumber(schoolID uuid.UUID, schoolName, className string, year int) (string, error) {
	// Generate school initials
	var schoolInitials string
	for _, word := range strings.Fields(schoolName) {
		if len(word) > 0 {
			schoolInitials += strings.ToUpper(string(word[0]))
		}
	}
	
	// Find last admission number
	pattern := fmt.Sprintf("%s/%s/%d/%%", schoolInitials, className, year)
	lastAdmissionNo, err := s.repo.GetLastAdmissionNumber(schoolID, pattern)
	if err != nil {
		return "", err
	}
	
	sequence := 1
	if lastAdmissionNo != "" {
		parts := strings.Split(lastAdmissionNo, "/")
		if len(parts) == 4 {
			if num, err := strconv.Atoi(parts[3]); err == nil {
				sequence = num + 1
			}
		}
	}
	
	// Generate and verify uniqueness
	for i := 0; i < 100; i++ {
		admissionNo := fmt.Sprintf("%s/%s/%d/%03d", schoolInitials, className, year, sequence)
		exists, err := s.repo.CheckAdmissionNumberExists(schoolID, admissionNo)
		if err != nil {
			return "", err
		}
		if !exists {
			return admissionNo, nil
		}
		sequence++
	}
	
	return "", fmt.Errorf("unable to generate unique admission number")
}

func (s *RegistrationService) RegisterStudent(student *models.Student, enrollment *models.Enrollment, guardians []models.Guardian) error {
	return s.repo.CreateBatch(student, enrollment, guardians)
}

func (s *RegistrationService) SendRegistrationConfirmation(guardianEmail, studentName, admissionNo, schoolName string) error {
	if s.emailService != nil && guardianEmail != "" {
		return s.emailService.SendRegistrationConfirmation(guardianEmail, studentName, admissionNo, schoolName)
	}
	return nil
}


type GuardianInput struct {
	Relationship     string
	FullName         string
	Phone            string
	AlternativePhone string
	Email            string
	Occupation       string
	Address          string
	Workplace        string
	WorkAddress      string
	IsPrimaryContact bool
	IsEmergency      bool
	IsFeePayer       bool
	NationalID       string
}

type RegistrationRequest struct {
	FirstName        string
	MiddleName       string
	LastName         string
	DateOfBirth      *time.Time
	Gender           string
	Nationality      string
	Religion         string
	LIN              string
	SchoolPayCode    string
	Email            string
	Phone            string
	Address          string
	District         string
	Village          string
	ClassLevel       string
	ClassID          string
	Term             string
	Year             int
	ResidenceType    string
	PreviousSchool   string
	PreviousClass    string
	SpecialNeeds     string
	DisabilityStatus string
	Guardians        []GuardianInput
}

type RegistrationResult struct {
	Student   *models.Student
	Guardians []models.Guardian
	Class     *models.Class
}

func (s *RegistrationService) RegisterStudentComprehensive(schoolID uuid.UUID, classID *uuid.UUID, req *RegistrationRequest) (*RegistrationResult, error) {
	// Get school
	school, err := s.repo.GetSchool(schoolID)
	if err != nil {
		return nil, fmt.Errorf("school not found")
	}

	// Find or create class
	var class *models.Class
	if classID != nil {
		class, err = s.repo.GetClass(*classID, schoolID)
		if err != nil {
			return nil, fmt.Errorf("class not found")
		}
	} else {
		class, err = s.repo.FindOrCreateClass(schoolID, req.ClassLevel, req.Term, req.Year)
		if err != nil {
			return nil, err
		}
	}

	// Generate admission number
	admissionNo, err := s.GenerateAdmissionNumber(schoolID, school.Name, class.Name, req.Year)
	if err != nil {
		return nil, err
	}

	// Set defaults
	nationality := req.Nationality
	if nationality == "" {
		nationality = "Ugandan"
	}
	residenceType := req.ResidenceType
	if residenceType == "" {
		residenceType = "Day"
	}
	admissionDate := time.Now()

	// Create student
	student := &models.Student{
		SchoolID:         schoolID,
		AdmissionNo:      admissionNo,
		LIN:              req.LIN,
		SchoolPayCode:    req.SchoolPayCode,
		FirstName:        req.FirstName,
		MiddleName:       req.MiddleName,
		LastName:         req.LastName,
		DateOfBirth:      req.DateOfBirth,
		Gender:           req.Gender,
		Nationality:      nationality,
		Religion:         req.Religion,
		Email:            req.Email,
		Phone:            req.Phone,
		Address:          req.Address,
		District:         req.District,
		Village:          req.Village,
		ResidenceType:    residenceType,
		AdmissionDate:    &admissionDate,
		Status:           "active",
		PreviousSchool:   req.PreviousSchool,
		PreviousClass:    req.PreviousClass,
		SpecialNeeds:     req.SpecialNeeds,
		DisabilityStatus: req.DisabilityStatus,
	}

	// Create enrollment
	enrollment := &models.Enrollment{
		ClassID:    class.ID,
		Year:       req.Year,
		Term:       req.Term,
		Status:     "active",
		EnrolledOn: time.Now(),
	}

	// Create guardians
	var guardians []models.Guardian
	for _, g := range req.Guardians {
		guardian := models.Guardian{
			SchoolID:         schoolID,
			Relationship:     g.Relationship,
			FullName:         g.FullName,
			Phone:            g.Phone,
			AlternativePhone: g.AlternativePhone,
			Email:            g.Email,
			Occupation:       g.Occupation,
			Address:          g.Address,
			Workplace:        g.Workplace,
			WorkAddress:      g.WorkAddress,
			IsPrimaryContact: g.IsPrimaryContact,
			IsEmergency:      g.IsEmergency,
			IsFeePayer:       g.IsFeePayer,
			NationalID:       g.NationalID,
		}
		guardians = append(guardians, guardian)
	}

	// Register in transaction
	if err := s.repo.CreateBatch(student, enrollment, guardians); err != nil {
		return nil, err
	}

	// Send confirmation emails
	go func() {
		studentName := fmt.Sprintf("%s %s", student.FirstName, student.LastName)
		for _, guardian := range guardians {
			if guardian.Email != "" {
				s.SendRegistrationConfirmation(guardian.Email, studentName, student.AdmissionNo, school.Name)
			}
		}
	}()

	return &RegistrationResult{
		Student:   student,
		Guardians: guardians,
		Class:     class,
	}, nil
}

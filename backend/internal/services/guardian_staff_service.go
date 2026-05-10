package services

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type GuardianStaffService struct {
	db *gorm.DB
}

func NewGuardianStaffService(db *gorm.DB) *GuardianStaffService {
	return &GuardianStaffService{db: db}
}

// LinkGuardianToStaff creates a link between a guardian and staff member
func (s *GuardianStaffService) LinkGuardianToStaff(guardianID, staffID, schoolID uuid.UUID, relationship string, isPrimaryContact bool) (*models.GuardianStaff, error) {
	// Check if link already exists
	var existing models.GuardianStaff
	if err := s.db.Where("guardian_id = ? AND staff_id = ?", guardianID, staffID).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("link already exists")
	}

	link := &models.GuardianStaff{
		GuardianID:       guardianID,
		StaffID:          staffID,
		SchoolID:         schoolID,
		Relationship:     relationship,
		IsPrimaryContact: isPrimaryContact,
	}

	if err := s.db.Create(link).Error; err != nil {
		return nil, err
	}

	return link, nil
}

// UnlinkGuardianFromStaff removes a link between guardian and staff
func (s *GuardianStaffService) UnlinkGuardianFromStaff(guardianID, staffID uuid.UUID) error {
	return s.db.Where("guardian_id = ? AND staff_id = ?", guardianID, staffID).Delete(&models.GuardianStaff{}).Error
}

// GetStaffLinksForGuardian gets all staff linked to a guardian
func (s *GuardianStaffService) GetStaffLinksForGuardian(guardianID uuid.UUID) ([]models.GuardianStaff, error) {
	var links []models.GuardianStaff
	err := s.db.Preload("Staff").Preload("Guardian").Where("guardian_id = ?", guardianID).Find(&links).Error
	return links, err
}

// GetGuardianLinksForStaff gets all guardians linked to a staff member
func (s *GuardianStaffService) GetGuardianLinksForStaff(staffID uuid.UUID) ([]models.GuardianStaff, error) {
	var links []models.GuardianStaff
	err := s.db.Preload("Guardian").Preload("Staff").Where("staff_id = ?", staffID).Find(&links).Error
	return links, err
}

// UpdateLink updates a guardian-staff link
func (s *GuardianStaffService) UpdateLink(guardianID, staffID uuid.UUID, relationship string, isPrimaryContact bool) error {
	return s.db.Model(&models.GuardianStaff{}).
		Where("guardian_id = ? AND staff_id = ?", guardianID, staffID).
		Updates(map[string]interface{}{
			"relationship":       relationship,
			"is_primary_contact": isPrimaryContact,
		}).Error
}

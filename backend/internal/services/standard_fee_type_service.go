package services

import (
	"fmt"
	"log"

	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type StandardFeeTypeService struct {
	db *gorm.DB
}

func NewStandardFeeTypeService(db *gorm.DB) *StandardFeeTypeService {
	return &StandardFeeTypeService{db: db}
}

// SeedStandardFeeTypes seeds the database with standard fee types
func (s *StandardFeeTypeService) SeedStandardFeeTypes() error {
	// Ensure the table exists
	if !s.db.Migrator().HasTable(&models.StandardFeeType{}) {
		if err := s.db.Migrator().CreateTable(&models.StandardFeeType{}); err != nil {
			return fmt.Errorf("failed to create standard_fee_types table: %w", err)
		}
		log.Println("Created standard_fee_types table")
	}
	feeTypes := []models.StandardFeeType{
		// Core Academic Fees (Compulsory)
		{
			Name:         "Tuition",
			Code:         "TUITION",
			Category:     "Academic",
			Description:  "Core academic instruction fees",
			IsCompulsory: true,
			AppliesToLevels: models.JSONB{"levels": []string{"ECCE", "Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Registration",
			Code:         "REGISTRATION",
			Category:     "Academic",
			Description:  "Student registration and enrollment fees",
			IsCompulsory: true,
			AppliesToLevels: models.JSONB{"levels": []string{"ECCE", "Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Examination",
			Code:         "EXAMINATION",
			Category:     "Academic",
			Description:  "Internal examination fees",
			IsCompulsory: true,
			AppliesToLevels: models.JSONB{"levels": []string{"Primary", "O-Level", "A-Level"}},
		},

		// Practical & Activity Fees (Optional)
		{
			Name:         "Field Work",
			Code:         "FIELD_WORK",
			Category:     "Practical",
			Description:  "Field work and educational trips",
			IsCompulsory: false,
			AppliesToLevels: models.JSONB{"levels": []string{"Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Extra Lessons",
			Code:         "EXTRA_LESSONS",
			Category:     "Academic",
			Description:  "Additional coaching and remedial classes",
			IsCompulsory: false,
			AppliesToLevels: models.JSONB{"levels": []string{"Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Holiday Lessons",
			Code:         "HOLIDAY_LESSONS",
			Category:     "Academic",
			Description:  "Holiday coaching programs",
			IsCompulsory: false,
			AppliesToLevels: models.JSONB{"levels": []string{"Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Mocks",
			Code:         "MOCKS",
			Category:     "Academic",
			Description:  "Mock examination fees",
			IsCompulsory: false,
			AppliesToLevels: models.JSONB{"levels": []string{"O-Level", "A-Level"}},
		},

		// Administrative Fees
		{
			Name:         "Handling Fee",
			Code:         "HANDLING_FEE",
			Category:     "Administrative",
			Description:  "Document processing and handling charges",
			IsCompulsory: false,
			AppliesToLevels: models.JSONB{"levels": []string{"ECCE", "Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Development",
			Code:         "DEVELOPMENT",
			Category:     "Administrative",
			Description:  "School development and infrastructure",
			IsCompulsory: true,
			AppliesToLevels: models.JSONB{"levels": []string{"ECCE", "Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Medical",
			Code:         "MEDICAL",
			Category:     "Welfare",
			Description:  "Health services and medical care",
			IsCompulsory: true,
			AppliesToLevels: models.JSONB{"levels": []string{"ECCE", "Primary", "O-Level", "A-Level"}},
		},

		// Boarding & Accommodation
		{
			Name:         "Boarding",
			Code:         "BOARDING",
			Category:     "Accommodation",
			Description:  "Boarding and accommodation fees",
			IsCompulsory: false,
			AppliesToLevels: models.JSONB{"levels": []string{"Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Meals",
			Code:         "MEALS",
			Category:     "Accommodation",
			Description:  "Meals and catering services",
			IsCompulsory: false,
			AppliesToLevels: models.JSONB{"levels": []string{"ECCE", "Primary", "O-Level", "A-Level"}},
		},

		// Materials & Supplies (Compulsory)
		{
			Name:         "Uniform",
			Code:         "UNIFORM",
			Category:     "Materials",
			Description:  "School uniform and clothing",
			IsCompulsory: true,
			AppliesToLevels: models.JSONB{"levels": []string{"ECCE", "Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Books",
			Code:         "BOOKS",
			Category:     "Materials",
			Description:  "Textbooks and learning materials",
			IsCompulsory: true,
			AppliesToLevels: models.JSONB{"levels": []string{"ECCE", "Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Stationery",
			Code:         "STATIONERY",
			Category:     "Materials",
			Description:  "Exercise books and stationery",
			IsCompulsory: true,
			AppliesToLevels: models.JSONB{"levels": []string{"ECCE", "Primary", "O-Level", "A-Level"}},
		},

		// Transport & Activities
		{
			Name:         "Transport",
			Code:         "TRANSPORT",
			Category:     "Transport",
			Description:  "School transport services",
			IsCompulsory: false,
			AppliesToLevels: models.JSONB{"levels": []string{"ECCE", "Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Sports",
			Code:         "SPORTS",
			Category:     "Activities",
			Description:  "Sports and physical education",
			IsCompulsory: false,
			AppliesToLevels: models.JSONB{"levels": []string{"Primary", "O-Level", "A-Level"}},
		},
		{
			Name:         "Co-curricular",
			Code:         "CO_CURRICULAR",
			Category:     "Activities",
			Description:  "Clubs and co-curricular activities",
			IsCompulsory: false,
			AppliesToLevels: models.JSONB{"levels": []string{"Primary", "O-Level", "A-Level"}},
		},

		// Other
		{
			Name:         "Other",
			Code:         "OTHER",
			Category:     "Miscellaneous",
			Description:  "Other miscellaneous fees",
			IsCompulsory: false,
			AppliesToLevels: models.JSONB{"levels": []string{"ECCE", "Primary", "O-Level", "A-Level"}},
		},
	}

	for _, feeType := range feeTypes {
		var existing models.StandardFeeType
		err := s.db.Where("code = ?", feeType.Code).First(&existing).Error
		
		if err == gorm.ErrRecordNotFound {
			// Create new fee type
			if err := s.db.Create(&feeType).Error; err != nil {
				log.Printf("Error creating fee type %s: %v", feeType.Code, err)
				return err
			}
			log.Printf("Created fee type: %s", feeType.Name)
		} else if err != nil {
			log.Printf("Error checking fee type %s: %v", feeType.Code, err)
			return err
		} else {
			// Update existing fee type
			existing.Name = feeType.Name
			existing.Category = feeType.Category
			existing.Description = feeType.Description
			existing.IsCompulsory = feeType.IsCompulsory
			existing.AppliesToLevels = feeType.AppliesToLevels
			
			if err := s.db.Save(&existing).Error; err != nil {
				log.Printf("Error updating fee type %s: %v", feeType.Code, err)
				return err
			}
			log.Printf("Updated fee type: %s", feeType.Name)
		}
	}

	log.Printf("Successfully seeded %d standard fee types", len(feeTypes))
	return nil
}

// GetFeeTypesByLevel returns fee types applicable to a specific level
func (s *StandardFeeTypeService) GetFeeTypesByLevel(level string) ([]models.StandardFeeType, error) {
	var feeTypes []models.StandardFeeType
	
	// Query fee types where the level is in the applies_to_levels JSON array
	err := s.db.Where("JSON_CONTAINS(applies_to_levels->'$.levels', ?)", fmt.Sprintf("\"%s\"", level)).Find(&feeTypes).Error
	if err != nil {
		return nil, err
	}
	
	return feeTypes, nil
}

// GetAllFeeTypes returns all standard fee types
func (s *StandardFeeTypeService) GetAllFeeTypes() ([]models.StandardFeeType, error) {
	var feeTypes []models.StandardFeeType
	err := s.db.Order("category, name").Find(&feeTypes).Error
	return feeTypes, err
}

// GetFeeTypesByCategory returns fee types by category
func (s *StandardFeeTypeService) GetFeeTypesByCategory(category string) ([]models.StandardFeeType, error) {
	var feeTypes []models.StandardFeeType
	err := s.db.Where("category = ?", category).Order("name").Find(&feeTypes).Error
	return feeTypes, err
}

// GetCompulsoryFeeTypes returns only compulsory fee types for a level
func (s *StandardFeeTypeService) GetCompulsoryFeeTypes(level string) ([]models.StandardFeeType, error) {
	var feeTypes []models.StandardFeeType
	
	err := s.db.Where("is_compulsory = ? AND JSON_CONTAINS(applies_to_levels->'$.levels', ?)", 
		true, fmt.Sprintf("\"%s\"", level)).Find(&feeTypes).Error
	if err != nil {
		return nil, err
	}
	
	return feeTypes, nil
}

// GetFeeTypeByCode returns a fee type by its code
func (s *StandardFeeTypeService) GetFeeTypeByCode(code string) (*models.StandardFeeType, error) {
	var feeType models.StandardFeeType
	err := s.db.Where("code = ?", code).First(&feeType).Error
	if err != nil {
		return nil, err
	}
	return &feeType, nil
}

// GetFeeTypeCategories returns all unique categories
func (s *StandardFeeTypeService) GetFeeTypeCategories() ([]string, error) {
	var categories []string
	err := s.db.Model(&models.StandardFeeType{}).Distinct("category").Pluck("category", &categories).Error
	return categories, err
}
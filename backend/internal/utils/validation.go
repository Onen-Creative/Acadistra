package utils

import (
	"fmt"
	"regexp"
	"strings"
)

// ValidatePhone validates phone number format
func ValidatePhone(phone string) error {
	if phone == "" {
		return fmt.Errorf("phone number is required")
	}
	// Uganda phone format: +256-XXX-XXX-XXX or 0XXX-XXX-XXX
	phoneRegex := regexp.MustCompile(`^(\+256|0)[0-9]{9}$|^(\+256-|0)[0-9]{3}-[0-9]{3}-[0-9]{3}$`)
	cleanPhone := strings.ReplaceAll(phone, "-", "")
	cleanPhone = strings.ReplaceAll(cleanPhone, " ", "")
	if !phoneRegex.MatchString(cleanPhone) {
		return fmt.Errorf("invalid phone number format")
	}
	return nil
}

// ValidateEmail validates email format
func ValidateEmail(email string) error {
	if email == "" {
		return nil // Email is optional
	}
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}
	return nil
}

// ValidateGuardianRelationship validates guardian relationship
func ValidateGuardianRelationship(relationship string) error {
	validRelationships := []string{"Father", "Mother", "Legal Guardian", "Sponsor", "Other"}
	for _, valid := range validRelationships {
		if strings.EqualFold(relationship, valid) {
			return nil
		}
	}
	return fmt.Errorf("invalid relationship. Must be one of: Father, Mother, Legal Guardian, Sponsor, Other")
}

// ValidateResidenceType validates residence type
func ValidateResidenceType(residenceType string) error {
	if residenceType == "" {
		return nil // Optional, defaults to "Day"
	}
	validTypes := []string{"Day", "Boarding"}
	for _, valid := range validTypes {
		if strings.EqualFold(residenceType, valid) {
			return nil
		}
	}
	return fmt.Errorf("invalid residence type. Must be either 'Day' or 'Boarding'")
}

// ValidateStudentStatus validates student status
func ValidateStudentStatus(status string) error {
	if status == "" {
		return nil // Optional, defaults to "active"
	}
	validStatuses := []string{"active", "suspended", "graduated", "transferred", "withdrawn"}
	for _, valid := range validStatuses {
		if strings.EqualFold(status, valid) {
			return nil
		}
	}
	return fmt.Errorf("invalid status. Must be one of: active, suspended, graduated, transferred, withdrawn")
}

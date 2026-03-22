package utils

import (
	"errors"
	"net"
	"net/mail"
	"strings"
	"time"
)

// ValidateEmailFormat validates email format and basic domain checks
func ValidateEmailFormat(email string) error {
	if email == "" {
		return errors.New("email is required")
	}
	
	// Parse email
	addr, err := mail.ParseAddress(email)
	if err != nil {
		return errors.New("invalid email format")
	}
	
	// Check for common typos
	if !strings.Contains(addr.Address, "@") {
		return errors.New("email must contain @")
	}
	
	parts := strings.Split(addr.Address, "@")
	if len(parts) != 2 {
		return errors.New("invalid email format")
	}
	
	if parts[0] == "" || parts[1] == "" {
		return errors.New("invalid email format")
	}
	
	if !strings.Contains(parts[1], ".") {
		return errors.New("invalid email domain")
	}
	
	// Check for common typos in popular domains
	domain := strings.ToLower(parts[1])
	commonTypos := map[string]string{
		"gmial.com":    "gmail.com",
		"gmai.com":     "gmail.com",
		"yahooo.com":   "yahoo.com",
		"yaho.com":     "yahoo.com",
		"outlok.com":   "outlook.com",
		"hotmial.com":  "hotmail.com",
	}
	
	if correct, exists := commonTypos[domain]; exists {
		return errors.New("did you mean " + correct + "?")
	}
	
	return nil
}

// ValidateEmailDomain performs DNS MX record lookup to verify domain exists
func ValidateEmailDomain(email string) error {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return errors.New("invalid email format")
	}
	
	domain := parts[1]
	
	// Set timeout for DNS lookup
	timeout := 3 * time.Second
	done := make(chan error, 1)
	
	go func() {
		_, err := net.LookupMX(domain)
		done <- err
	}()
	
	select {
	case err := <-done:
		if err != nil {
			return errors.New("email domain does not exist or has no mail server")
		}
		return nil
	case <-time.After(timeout):
		// Don't fail on timeout, just log it
		return nil
	}
}

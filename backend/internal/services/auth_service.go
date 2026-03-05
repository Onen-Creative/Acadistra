package services

import (
	"errors"
	"time"

	"github.com/alexedwards/argon2id"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/config"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotActive      = errors.New("user not active")
	ErrInvalidToken       = errors.New("invalid token")
	ErrTokenRevoked       = errors.New("token revoked")
)

type AuthService struct {
	db           *gorm.DB
	cfg          *config.Config
	params       *argon2id.Params
	auditService *AuditService
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type Claims struct {
	UserID        uuid.UUID  `json:"user_id"`
	SchoolID      *uuid.UUID `json:"school_id"`
	Role          string     `json:"role"`
	Email         string     `json:"email"`
	GuardianPhone string     `json:"guardian_phone,omitempty"`
	jwt.RegisteredClaims
}

func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	params := &argon2id.Params{
		Memory:      cfg.Argon2.Memory,
		Iterations:  cfg.Argon2.Iterations,
		Parallelism: cfg.Argon2.Parallelism,
		SaltLength:  cfg.Argon2.SaltLength,
		KeyLength:   cfg.Argon2.KeyLength,
	}

	return &AuthService{
		db:           db,
		cfg:          cfg,
		params:       params,
		auditService: NewAuditService(db),
	}
}

func (s *AuthService) HashPassword(password string) (string, error) {
	return argon2id.CreateHash(password, s.params)
}

func (s *AuthService) VerifyPassword(hash, password string) (bool, error) {
	return argon2id.ComparePasswordAndHash(password, hash)
}

func (s *AuthService) Login(identifier, password string) (*TokenPair, *models.User, error) {
	var user models.User
	
	// Try to find user by email first
	err := s.db.Preload("School").Where("LOWER(email) = LOWER(?)", identifier).First(&user).Error
	if err == nil {
		// User found by email - verify password
		if !user.IsActive {
			return nil, nil, ErrUserNotActive
		}

		if user.Role != "system_admin" && user.Role != "parent" && user.School != nil && !user.School.IsActive {
			return nil, nil, errors.New("school is inactive")
		}

		match, err := s.VerifyPassword(user.PasswordHash, password)
		if err != nil || !match {
			return nil, nil, ErrInvalidCredentials
		}

		tokens, err := s.GenerateTokenPair(&user)
		if err != nil {
			return nil, nil, err
		}
		return tokens, &user, nil
	}

	// Email not found - check if it's a parent login with phone
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, err
	}

	// Try guardian phone lookup
	var guardian models.Guardian
	if err := s.db.Preload("Student.School").Where("phone = ?", identifier).First(&guardian).Error; err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	// Create or get parent user account
	var parentUser models.User
	if err := s.db.Where("email = ? AND role = 'parent'", guardian.Email).First(&parentUser).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, err
		}
		// Create parent user
		hash, _ := s.HashPassword(password)
		schoolIDPtr := &guardian.Student.SchoolID
		parentUser = models.User{
			Email:        guardian.Email,
			FullName:     guardian.FullName,
			Role:         "parent",
			SchoolID:     schoolIDPtr,
			PasswordHash: hash,
			IsActive:     true,
		}
		if err := s.db.Create(&parentUser).Error; err != nil {
			return nil, nil, err
		}
	}

	user = parentUser
	s.db.Preload("School").First(&user, user.ID)

	if !user.IsActive {
		return nil, nil, ErrUserNotActive
	}

	// For parents, verify password or allow first-time login
	if user.PasswordHash == "" {
		hash, err := s.HashPassword(password)
		if err != nil {
			return nil, nil, err
		}
		user.PasswordHash = hash
		s.db.Save(&user)
	} else {
		match, err := s.VerifyPassword(user.PasswordHash, password)
		if err != nil || !match {
			return nil, nil, ErrInvalidCredentials
		}
	}

	tokens, err := s.GenerateTokenPairWithPhone(&user, guardian.Phone)
	if err != nil {
		return nil, nil, err
	}

	return tokens, &user, nil
}

func (s *AuthService) GenerateTokenPairWithPhone(user *models.User, guardianPhone string) (*TokenPair, error) {
	// Access token
	accessClaims := &Claims{
		UserID:        user.ID,
		SchoolID:      user.SchoolID,
		Role:          user.Role,
		Email:         user.Email,
		GuardianPhone: guardianPhone,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.cfg.JWT.AccessExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(s.cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	// Refresh token
	refreshClaims := &Claims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.cfg.JWT.RefreshExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(s.cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	// Store refresh token
	rt := &models.RefreshToken{
		UserID:    user.ID,
		Token:     refreshTokenString,
		ExpiresAt: time.Now().Add(s.cfg.JWT.RefreshExpiry),
		Revoked:   false,
	}
	if err := s.db.Create(rt).Error; err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresIn:    int64(s.cfg.JWT.AccessExpiry.Seconds()),
	}, nil
}

func (s *AuthService) GenerateTokenPair(user *models.User) (*TokenPair, error) {
	// For parent users, get guardian phone
	guardianPhone := ""
	if user.Role == "parent" {
		var guardian models.Guardian
		if err := s.db.Where("email = ?", user.Email).First(&guardian).Error; err == nil {
			guardianPhone = guardian.Phone
		}
	}
	
	// Access token
	accessClaims := &Claims{
		UserID:        user.ID,
		SchoolID:      user.SchoolID,
		Role:          user.Role,
		Email:         user.Email,
		GuardianPhone: guardianPhone,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.cfg.JWT.AccessExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(s.cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	// Refresh token
	refreshClaims := &Claims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.cfg.JWT.RefreshExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(s.cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	// Store refresh token
	rt := &models.RefreshToken{
		UserID:    user.ID,
		Token:     refreshTokenString,
		ExpiresAt: time.Now().Add(s.cfg.JWT.RefreshExpiry),
		Revoked:   false,
	}
	if err := s.db.Create(rt).Error; err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresIn:    int64(s.cfg.JWT.AccessExpiry.Seconds()),
	}, nil
}

func (s *AuthService) RefreshTokens(refreshToken string) (*TokenPair, error) {
	// Verify token
	claims, err := s.VerifyToken(refreshToken)
	if err != nil {
		return nil, err
	}

	// Check if token is revoked
	var rt models.RefreshToken
	if err := s.db.Where("token = ?", refreshToken).First(&rt).Error; err != nil {
		return nil, ErrInvalidToken
	}

	if rt.Revoked || time.Now().After(rt.ExpiresAt) {
		return nil, ErrTokenRevoked
	}

	// Get user
	var user models.User
	if err := s.db.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrUserNotActive
	}

	// Revoke old token
	s.db.Model(&rt).Update("revoked", true)

	// Generate new pair
	return s.GenerateTokenPair(&user)
}

func (s *AuthService) VerifyToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(s.cfg.JWT.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}

func (s *AuthService) RevokeToken(refreshToken string) error {
	return s.db.Model(&models.RefreshToken{}).
		Where("token = ?", refreshToken).
		Update("revoked", true).Error
}

func (s *AuthService) CreateUser(user *models.User, password string) error {
	hash, err := s.HashPassword(password)
	if err != nil {
		return err
	}

	user.PasswordHash = hash
	return s.db.Create(user).Error
}

func (s *AuthService) LogAudit(userID uuid.UUID, action, resourceType string, resourceID uuid.UUID, before, after models.JSONB, ip string) {
	s.auditService.Log(userID, action, resourceType, resourceID, before, after, ip)
}

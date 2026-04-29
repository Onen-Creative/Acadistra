package middleware

import (
	"bytes"
	"encoding/json"
	"io"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

func AuditLogger(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip audit for GET requests and non-mutating operations
		if c.Request.Method == "GET" || c.Request.URL.Path == "/api/v1/ws" {
			c.Next()
			return
		}

		// Capture request body
		var requestBody []byte
		if c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Get user info
		userID := c.GetString("user_id")
		if userID == "" {
			c.Next()
			return
		}
		
		// Process request
		c.Next()

		// Only log successful mutations (2xx status codes)
		if c.Writer.Status() < 200 || c.Writer.Status() >= 300 {
			return
		}

		// Determine action and entity
		action, entity := getActionAndEntity(c.Request.Method, c.Request.URL.Path)
		if action == "" {
			return
		}

		// Parse request body for details
		var details map[string]interface{}
		if len(requestBody) > 0 {
			json.Unmarshal(requestBody, &details)
		}

		// Create audit log
		userUUID, err := uuid.Parse(userID)
		if err != nil {
			return
		}

		resourceID := uuid.Nil
		if c.Param("id") != "" {
			if parsed, err := uuid.Parse(c.Param("id")); err == nil {
				resourceID = parsed
			}
		}

		// Get school ID and role from context
		var schoolID *uuid.UUID
		if schoolIDStr := c.GetString("school_id"); schoolIDStr != "" {
			if parsed, err := uuid.Parse(schoolIDStr); err == nil {
				schoolID = &parsed
			}
		}
		userRole := c.GetString("user_role")

		// Extract class_id from request body if present
		var classID *uuid.UUID
		if classIDStr, ok := details["class_id"].(string); ok {
			if parsed, err := uuid.Parse(classIDStr); err == nil {
				classID = &parsed
			}
		}

		log := models.AuditLog{
			ActorUserID:  userUUID,
			SchoolID:     schoolID,
			UserRole:     userRole,
			Action:       action,
			ResourceType: entity,
			ResourceID:   resourceID,
			ClassID:      classID,
			After:        models.JSONB(details),
			IP:           c.ClientIP(),
			UserAgent:    c.Request.UserAgent(),
		}

		db.Create(&log)
	}
}

func getActionAndEntity(method, path string) (string, string) {
	// Map HTTP methods to actions
	actionMap := map[string]string{
		"POST":   "create",
		"PUT":    "update",
		"PATCH":  "update",
		"DELETE": "delete",
	}

	action := actionMap[method]
	if action == "" {
		return "", ""
	}

	// Extract entity from path
	entityMap := map[string]string{
		"/api/v1/students":              "student",
		"/api/v1/users":                 "user",
		"/api/v1/school-users":          "user",
		"/api/v1/results":               "result",
		"/api/v1/classes":               "class",
		"/api/v1/schools":               "school",
		"/api/v1/fees":                  "fees",
		"/api/v1/fees/payment":          "payment",
		"/api/v1/library/books":         "book",
		"/api/v1/library/issue":         "book_issue",
		"/api/v1/library/return":        "book_return",
		"/api/v1/clinic/visits":         "clinic_visit",
		"/api/v1/clinic/health-profiles": "health_profile",
		"/api/v1/clinic/medicines":      "medicine",
		"/api/v1/clinic/consumables":    "consumable",
		"/api/v1/clinic/incidents":      "incident",
		"/api/v1/clinic/medication-admin": "medication_admin",
		"/api/v1/guardians":             "guardian",
	}

	for prefix, entity := range entityMap {
		if len(path) >= len(prefix) && path[:len(prefix)] == prefix {
			return action, entity
		}
	}

	return "", ""
}

package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/services"
)

// RequestLogger logs API requests for monitoring
func RequestLogger(monitoringService *services.SystemMonitoringService) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		
		// Process request
		c.Next()
		
		// Calculate response time
		duration := time.Since(start)
		responseTime := float64(duration.Milliseconds())
		
		// Get user and school info
		var userID, schoolID *uuid.UUID
		if userIDStr := c.GetString("user_id"); userIDStr != "" {
			if parsed, err := uuid.Parse(userIDStr); err == nil {
				userID = &parsed
			}
		}
		if schoolIDStr := c.GetString("school_id"); schoolIDStr != "" {
			if parsed, err := uuid.Parse(schoolIDStr); err == nil {
				schoolID = &parsed
			}
		}
		
		// Get error message if any
		errorMsg := ""
		if len(c.Errors) > 0 {
			errorMsg = c.Errors.String()
		}
		
		// Log the request asynchronously
		go monitoringService.LogAPIRequest(
			userID,
			schoolID,
			c.Request.Method,
			c.Request.URL.Path,
			c.Writer.Status(),
			responseTime,
			c.ClientIP(),
			c.Request.UserAgent(),
			errorMsg,
		)
		
		// Update session activity if user is authenticated
		if token := c.GetHeader("Authorization"); token != "" {
			go monitoringService.UpdateSessionActivity(token)
		}
	}
}

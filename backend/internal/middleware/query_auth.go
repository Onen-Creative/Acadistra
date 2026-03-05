package middleware

import (
	"github.com/gin-gonic/gin"
)

// AllowQueryToken middleware allows authentication token from query parameter
// This is useful for file downloads where headers can't be set (window.open)
func AllowQueryToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Query("token")
		if token != "" {
			c.Request.Header.Set("Authorization", "Bearer "+token)
		}
		c.Next()
	}
}

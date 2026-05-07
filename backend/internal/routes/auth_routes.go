package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/handlers"
)

func setupAuthRoutes(v1 *gin.RouterGroup, deps *Dependencies) {
	authHandler := handlers.NewAuthHandler(deps.AuthService, deps.MonitoringService)
	
	auth := v1.Group("/auth")
	{
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.Refresh)
		auth.POST("/logout", authHandler.Logout)
	}
}

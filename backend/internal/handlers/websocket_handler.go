package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/school-system/backend/internal/services"
	ws "github.com/school-system/backend/internal/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WebSocketHandler struct {
	authService *services.AuthService
}

func NewWebSocketHandler(authService *services.AuthService) *WebSocketHandler {
	return &WebSocketHandler{
		authService: authService,
	}
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// Get token from query parameter
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
		return
	}

	// Verify token
	claims, err := h.authService.VerifyToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
		return
	}

	// Get school ID from claims
	schoolID := ""
	if claims.SchoolID != nil {
		schoolID = claims.SchoolID.String()
	}
	
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to upgrade connection"})
		return
	}

	ws.GlobalHub.ServeWs(conn, schoolID)
}

// Legacy function for backward compatibility


package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
	ws "github.com/school-system/backend/internal/websocket"
)

type GuardianHandler struct {
	svc *services.GuardianService
}

func NewGuardianHandler(svc *services.GuardianService) *GuardianHandler {
	return &GuardianHandler{svc: svc}
}

func (h *GuardianHandler) Create(c *gin.Context) {
	var req services.CreateGuardianRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	guardian, err := h.svc.CreateWithStudentCheck(req, c.GetString("tenant_school_id"))
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "invalid student ID" || err.Error() == "student not found" {
			status = http.StatusNotFound
		} else if err.Error() == "access denied" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("guardian:created", guardian, guardian.SchoolID.String())
	c.JSON(http.StatusCreated, guardian)
}

func (h *GuardianHandler) List(c *gin.Context) {
	guardians, err := h.svc.ListBySchool(c.GetString("tenant_school_id"), c.Query("student_id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"guardians": guardians})
}

func (h *GuardianHandler) Get(c *gin.Context) {
	guardian, err := h.svc.GetByIDAndSchool(c.Param("id"), c.GetString("tenant_school_id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, guardian)
}

func (h *GuardianHandler) Update(c *gin.Context) {
	var req services.UpdateGuardianRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	guardian, err := h.svc.UpdateFields(c.Param("id"), c.GetString("tenant_school_id"), req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "guardian not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("guardian:updated", guardian, guardian.SchoolID.String())
	c.JSON(http.StatusOK, guardian)
}

func (h *GuardianHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.svc.DeleteByIDAndSchool(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("guardian:deleted", gin.H{"id": id}, schoolID)
	c.JSON(http.StatusOK, gin.H{"message": "Guardian deleted"})
}

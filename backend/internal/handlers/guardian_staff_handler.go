package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type GuardianStaffHandler struct {
	service *services.GuardianStaffService
}

func NewGuardianStaffHandler(db *gorm.DB) *GuardianStaffHandler {
	return &GuardianStaffHandler{
		service: services.NewGuardianStaffService(db),
	}
}

// LinkGuardianToStaff links a guardian to a staff member
func (h *GuardianStaffHandler) LinkGuardianToStaff(c *gin.Context) {
	var req struct {
		GuardianID       string `json:"guardian_id" binding:"required"`
		StaffID          string `json:"staff_id" binding:"required"`
		Relationship     string `json:"relationship" binding:"required"`
		IsPrimaryContact bool   `json:"is_primary_contact"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	guardianID, err := uuid.Parse(req.GuardianID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID"})
		return
	}

	staffID, err := uuid.Parse(req.StaffID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid staff ID"})
		return
	}

	link, err := h.service.LinkGuardianToStaff(guardianID, staffID, uuid.MustParse(schoolID), req.Relationship, req.IsPrimaryContact)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, link)
}

// UnlinkGuardianFromStaff removes a link between guardian and staff
func (h *GuardianStaffHandler) UnlinkGuardianFromStaff(c *gin.Context) {
	guardianID := c.Param("guardian_id")
	staffID := c.Param("staff_id")

	gid, err := uuid.Parse(guardianID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID"})
		return
	}

	sid, err := uuid.Parse(staffID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid staff ID"})
		return
	}

	if err := h.service.UnlinkGuardianFromStaff(gid, sid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Link removed successfully"})
}

// GetStaffLinksForGuardian gets all staff linked to a guardian
func (h *GuardianStaffHandler) GetStaffLinksForGuardian(c *gin.Context) {
	guardianID := c.Param("guardian_id")

	gid, err := uuid.Parse(guardianID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID"})
		return
	}

	links, err := h.service.GetStaffLinksForGuardian(gid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, links)
}

// GetGuardianLinksForStaff gets all guardians linked to a staff member
func (h *GuardianStaffHandler) GetGuardianLinksForStaff(c *gin.Context) {
	staffID := c.Param("staff_id")

	sid, err := uuid.Parse(staffID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid staff ID"})
		return
	}

	links, err := h.service.GetGuardianLinksForStaff(sid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, links)
}

// UpdateLink updates a guardian-staff link
func (h *GuardianStaffHandler) UpdateLink(c *gin.Context) {
	guardianID := c.Param("guardian_id")
	staffID := c.Param("staff_id")

	var req struct {
		Relationship     string `json:"relationship" binding:"required"`
		IsPrimaryContact bool   `json:"is_primary_contact"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	gid, err := uuid.Parse(guardianID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guardian ID"})
		return
	}

	sid, err := uuid.Parse(staffID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid staff ID"})
		return
	}

	if err := h.service.UpdateLink(gid, sid, req.Relationship, req.IsPrimaryContact); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Link updated successfully"})
}

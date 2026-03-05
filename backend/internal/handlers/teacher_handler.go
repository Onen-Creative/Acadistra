package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/config"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"github.com/school-system/backend/internal/utils"
	ws "github.com/school-system/backend/internal/websocket"
	"gorm.io/gorm"
)

type TeacherHandler struct {
	db          *gorm.DB
	authService *services.AuthService
}

func NewTeacherHandler(db *gorm.DB, cfg *config.Config) *TeacherHandler {
	return &TeacherHandler{
		db:          db,
		authService: services.NewAuthService(db, cfg),
	}
}

func (h *TeacherHandler) List(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	search := c.Query("search")
	status := c.Query("status")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	var teachers []struct {
		models.Staff
		TeacherProfile *models.TeacherProfile `json:"teacher_profile"`
	}
	query := h.db.Table("staff").Select("staff.*, teacher_profiles.id as teacher_profile_id").
		Joins("LEFT JOIN teacher_profiles ON teacher_profiles.staff_id = staff.id").
		Where("staff.school_id = ? AND staff.role = ?", schoolID, "Teacher")

	if search != "" {
		query = query.Where("staff.first_name ILIKE ? OR staff.last_name ILIKE ? OR staff.employee_id ILIKE ? OR staff.email ILIKE ?", 
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	if status != "" {
		query = query.Where("staff.status = ?", status)
	}

	var total int64
	h.db.Model(&models.Staff{}).Where("school_id = ? AND role = ?", schoolID, "Teacher").Count(&total)

	offset := (utils.Atoi(page) - 1) * utils.Atoi(limit)
	if err := query.Offset(offset).Limit(utils.Atoi(limit)).Order("staff.first_name, staff.last_name").Scan(&teachers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"teachers": teachers,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

func (h *TeacherHandler) Create(c *gin.Context) {
	var req models.Staff
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")
	req.SchoolID = uuid.MustParse(schoolID)
	req.Role = "Teacher"
	req.Status = "active"

	var count int64
	h.db.Model(&models.Staff{}).Where("school_id = ? AND role = ?", schoolID, "Teacher").Count(&count)
	
	for i := int(count + 1); ; i++ {
		employeeID := utils.GenerateID("TCH", i)
		var exists int64
		h.db.Model(&models.Staff{}).Where("school_id = ? AND employee_id = ?", schoolID, employeeID).Count(&exists)
		if exists == 0 {
			req.EmployeeID = employeeID
			break
		}
	}

	if req.Email != "" {
		schoolIDPtr := uuid.MustParse(schoolID)
		hashed, _ := h.authService.HashPassword("Teacher@123")
		fullName := req.FirstName
		if req.MiddleName != "" {
			fullName += " " + req.MiddleName
		}
		fullName += " " + req.LastName
		user := models.User{
			SchoolID:     &schoolIDPtr,
			Email:        req.Email,
			FullName:     fullName,
			Role:         "teacher",
			IsActive:     true,
			PasswordHash: hashed,
		}
		if err := h.db.Create(&user).Error; err == nil {
			req.UserID = &user.ID
		}
	}

	if err := h.db.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	teacherProfile := models.TeacherProfile{
		StaffID:  req.ID,
		SchoolID: req.SchoolID,
	}
	h.db.Create(&teacherProfile)

	ws.GlobalHub.Broadcast("teacher:created", req, schoolID)
	ws.GlobalHub.Broadcast("user:created", gin.H{"staff_id": req.ID}, schoolID)
	c.JSON(http.StatusCreated, req)
}

func (h *TeacherHandler) Get(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var staff models.Staff
	if err := h.db.Where("id = ? AND school_id = ? AND role = ?", id, schoolID, "Teacher").Preload("User").First(&staff).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Teacher not found"})
		return
	}

	var teacherProfile models.TeacherProfile
	h.db.Where("staff_id = ?", id).First(&teacherProfile)

	c.JSON(http.StatusOK, gin.H{"staff": staff, "teacher_profile": teacherProfile})
}

func (h *TeacherHandler) Update(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var staff models.Staff
	if err := h.db.Where("id = ? AND school_id = ? AND role = ?", id, schoolID, "Teacher").First(&staff).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Teacher not found"})
		return
	}

	var req models.Staff
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.ID = staff.ID
	req.SchoolID = staff.SchoolID
	req.Role = "Teacher"

	if err := h.db.Save(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("teacher:updated", req, schoolID)
	c.JSON(http.StatusOK, req)
}

func (h *TeacherHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.db.Where("id = ? AND school_id = ? AND role = ?", id, schoolID, "Teacher").Delete(&models.Staff{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("teacher:deleted", gin.H{"id": id}, schoolID)
	c.JSON(http.StatusOK, gin.H{"message": "Teacher deleted"})
}
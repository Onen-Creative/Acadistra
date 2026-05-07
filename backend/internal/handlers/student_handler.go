package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
	"github.com/school-system/backend/internal/utils"
)

type StudentHandler struct {
	svc *services.StudentService
}

func NewStudentHandler(svc *services.StudentService) *StudentHandler {
	return &StudentHandler{svc: svc}
}

// Get retrieves a single student by ID
func (h *StudentHandler) Get(c *gin.Context) {
	studentID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	student, err := h.svc.GetByID(studentID, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"student": student})
}

// Update updates student information
func (h *StudentHandler) Update(c *gin.Context) {
	studentID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		FirstName        string `json:"first_name"`
		MiddleName       string `json:"middle_name"`
		LastName         string `json:"last_name"`
		DateOfBirth      string `json:"date_of_birth"`
		Gender           string `json:"gender"`
		Nationality      string `json:"nationality"`
		Religion         string `json:"religion"`
		LIN              string `json:"lin"`
		SchoolPayCode    string `json:"schoolpay_code"`
		Email            string `json:"email"`
		Phone            string `json:"phone"`
		Address          string `json:"address"`
		District         string `json:"district"`
		Village          string `json:"village"`
		ResidenceType    string `json:"residence_type"`
		PreviousSchool   string `json:"previous_school"`
		PreviousClass    string `json:"previous_class"`
		SpecialNeeds     string `json:"special_needs"`
		DisabilityStatus string `json:"disability_status"`
		Status           string `json:"status"`
		PhotoURL         string `json:"photo_url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate and prepare updates
	updates := make(map[string]interface{})

	if req.Gender != "" {
		req.Gender = strings.Title(strings.ToLower(req.Gender))
		if req.Gender != "Male" && req.Gender != "Female" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Gender must be 'Male' or 'Female'"})
			return
		}
		updates["gender"] = req.Gender
	}

	if req.FirstName != "" {
		updates["first_name"] = strings.Title(strings.ToLower(utils.NormalizeText(req.FirstName)))
	}
	if req.MiddleName != "" {
		updates["middle_name"] = strings.Title(strings.ToLower(utils.NormalizeText(req.MiddleName)))
	}
	if req.LastName != "" {
		updates["last_name"] = strings.Title(strings.ToLower(utils.NormalizeText(req.LastName)))
	}
	if req.Nationality != "" {
		updates["nationality"] = req.Nationality
	}
	if req.Religion != "" {
		updates["religion"] = req.Religion
	}
	if req.LIN != "" {
		updates["lin"] = req.LIN
	}
	if req.SchoolPayCode != "" {
		updates["schoolpay_code"] = req.SchoolPayCode
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.Address != "" {
		updates["address"] = req.Address
	}
	if req.District != "" {
		updates["district"] = req.District
	}
	if req.Village != "" {
		updates["village"] = req.Village
	}
	if req.ResidenceType != "" {
		updates["residence_type"] = req.ResidenceType
	}
	if req.PreviousSchool != "" {
		updates["previous_school"] = req.PreviousSchool
	}
	if req.PreviousClass != "" {
		updates["previous_class"] = req.PreviousClass
	}
	if req.SpecialNeeds != "" {
		updates["special_needs"] = req.SpecialNeeds
	}
	if req.DisabilityStatus != "" {
		updates["disability_status"] = req.DisabilityStatus
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.PhotoURL != "" {
		updates["photo_url"] = req.PhotoURL
	}

	student, err := h.svc.UpdateStudent(studentID, schoolID, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update student"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student updated successfully", "student": student})
}

// Delete soft deletes a student
func (h *StudentHandler) Delete(c *gin.Context) {
	studentID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.svc.DeleteStudent(studentID, schoolID); err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete student"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student deleted successfully"})
}

// List lists all students with filters and pagination
func (h *StudentHandler) List(c *gin.Context) {
	if c.GetString("user_role") == "parent" && c.GetString("guardian_phone") != "" {
		h.GetMyChildren(c)
		return
	}

	page := 1
	if p, err := strconv.Atoi(c.Query("page")); err == nil && p > 0 {
		page = p
	}
	limit := 200
	if l, err := strconv.Atoi(c.Query("limit")); err == nil {
		limit = l
	}

	result, err := h.svc.List(c.GetString("tenant_school_id"), services.StudentListParams{
		Level:   c.Query("level"),
		ClassID: c.Query("class_id"),
		Year:    c.Query("year"),
		Term:    c.Query("term"),
		Search:  c.Query("search"),
		Gender:  c.Query("gender"),
		Page:    page,
		Limit:   limit,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}
	c.JSON(http.StatusOK, result)
}

// PromoteOrDemote promotes or demotes a student to a new class
func (h *StudentHandler) PromoteOrDemote(c *gin.Context) {
	studentID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		NewClassID string `json:"new_class_id" binding:"required"`
		Year       int    `json:"year" binding:"required"`
		Term       string `json:"term" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	enrollment, err := h.svc.PromoteOrDemote(studentID, schoolID, req.NewClassID, req.Year, req.Term)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to promote/demote student"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student promoted/demoted successfully", "enrollment": enrollment})
}

// GetMyChildren returns students for a parent based on guardian phone
func (h *StudentHandler) GetMyChildren(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	students, err := h.svc.GetMyChildren(guardianPhone, c.GetString("tenant_school_id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch children"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"students": students, "total": len(students)})
}

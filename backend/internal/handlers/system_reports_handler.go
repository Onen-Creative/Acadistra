package handlers

import (
	"bytes"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type SystemReportsHandler struct {
	db *gorm.DB
}

func NewSystemReportsHandler(db *gorm.DB) *SystemReportsHandler {
	return &SystemReportsHandler{db: db}
}

func (h *SystemReportsHandler) GenerateSchoolsReport(c *gin.Context) {
	var schools []struct {
		ID        string
		Name      string
		Type      string
		IsActive  bool
		CreatedAt time.Time
	}

	if err := h.db.Table("schools").
		Select("id, name, type, is_active, created_at").
		Order("created_at DESC").
		Find(&schools).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch schools"})
		return
	}

	f := excelize.NewFile()
	sheet := "Schools"
	f.SetSheetName("Sheet1", sheet)

	// Headers
	headers := []string{"ID", "Name", "Type", "Status", "Created At"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	// Data
	for i, school := range schools {
		status := "Active"
		if !school.IsActive {
			status = "Inactive"
		}
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), school.ID)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), school.Name)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), school.Type)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), status)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), school.CreatedAt.Format("2006-01-02"))
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=schools-report-%s.xlsx", time.Now().Format("2006-01-02")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

func (h *SystemReportsHandler) GenerateUsersReport(c *gin.Context) {
	var users []struct {
		ID        string
		Email     string
		Name      string
		Role      string
		IsActive  bool
		CreatedAt time.Time
	}

	if err := h.db.Table("users").
		Select("id, email, full_name as name, role, is_active, created_at").
		Order("created_at DESC").
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	f := excelize.NewFile()
	sheet := "Users"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"ID", "Email", "Name", "Role", "Status", "Created At"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	for i, user := range users {
		status := "Active"
		if !user.IsActive {
			status = "Inactive"
		}
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), user.ID)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), user.Email)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), user.Name)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), user.Role)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), status)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), user.CreatedAt.Format("2006-01-02"))
	}

	var buf bytes.Buffer
	f.Write(&buf)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=users-report-%s.xlsx", time.Now().Format("2006-01-02")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

func (h *SystemReportsHandler) GenerateStudentsReport(c *gin.Context) {
	var students []struct {
		ID          string
		Name        string
		AdmissionNo string
		ClassLevel  string
		SchoolName  string
		CreatedAt   time.Time
	}

	if err := h.db.Table("students").
		Select("students.id, students.name, students.admission_no, students.class_level, schools.name as school_name, students.created_at").
		Joins("LEFT JOIN schools ON students.school_id = schools.id").
		Order("students.created_at DESC").
		Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	f := excelize.NewFile()
	sheet := "Students"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"ID", "Name", "Admission No", "Class Level", "School", "Created At"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	for i, student := range students {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), student.ID)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), student.Name)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), student.AdmissionNo)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), student.ClassLevel)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), student.SchoolName)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), student.CreatedAt.Format("2006-01-02"))
	}

	var buf bytes.Buffer
	f.Write(&buf)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=students-report-%s.xlsx", time.Now().Format("2006-01-02")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

func (h *SystemReportsHandler) GenerateActivityReport(c *gin.Context) {
	var activities []struct {
		ID        string
		Action    string
		UserEmail string
		Timestamp time.Time
	}

	if err := h.db.Table("audit_logs").
		Select("audit_logs.id, audit_logs.action, users.email as user_email, audit_logs.timestamp").
		Joins("LEFT JOIN users ON audit_logs.actor_user_id = users.id").
		Order("audit_logs.timestamp DESC").
		Limit(1000).
		Find(&activities).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activities"})
		return
	}

	f := excelize.NewFile()
	sheet := "Activity"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"ID", "Action", "User", "Timestamp"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	for i, activity := range activities {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), activity.ID)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), activity.Action)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), activity.UserEmail)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), activity.Timestamp.Format("2006-01-02 15:04:05"))
	}

	var buf bytes.Buffer
	f.Write(&buf)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=activity-report-%s.xlsx", time.Now().Format("2006-01-02")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

func (h *SystemReportsHandler) GeneratePerformanceReport(c *gin.Context) {
	var stats struct {
		TotalSchools  int64
		TotalUsers    int64
		TotalStudents int64
		ActiveSchools int64
		ActiveUsers   int64
	}

	h.db.Table("schools").Count(&stats.TotalSchools)
	h.db.Table("users").Count(&stats.TotalUsers)
	h.db.Table("students").Count(&stats.TotalStudents)
	h.db.Table("schools").Where("is_active = ?", true).Count(&stats.ActiveSchools)
	h.db.Table("users").Where("is_active = ?", true).Count(&stats.ActiveUsers)

	f := excelize.NewFile()
	sheet := "Performance"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"Metric", "Value"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	metrics := []struct {
		Name  string
		Value interface{}
	}{
		{"Total Schools", stats.TotalSchools},
		{"Active Schools", stats.ActiveSchools},
		{"Total Users", stats.TotalUsers},
		{"Active Users", stats.ActiveUsers},
		{"Total Students", stats.TotalStudents},
		{"Report Generated", time.Now().Format("2006-01-02 15:04:05")},
	}

	for i, metric := range metrics {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), metric.Name)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), metric.Value)
	}

	var buf bytes.Buffer
	f.Write(&buf)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=performance-report-%s.xlsx", time.Now().Format("2006-01-02")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

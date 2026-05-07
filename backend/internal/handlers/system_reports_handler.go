package handlers

import (
	"bytes"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
	"github.com/xuri/excelize/v2"
)

type SystemReportsHandler struct {
	service *services.SystemReportsService
}

func NewSystemReportsHandler(service *services.SystemReportsService) *SystemReportsHandler {
	return &SystemReportsHandler{service: service}
}

func (h *SystemReportsHandler) GenerateSchoolsReport(c *gin.Context) {
	schools, err := h.service.GetSchoolsReportData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch schools"})
		return
	}

	f := excelize.NewFile()
	sheet := "Schools"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"ID", "Name", "Type", "Status", "Created At"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

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
	users, err := h.service.GetUsersReportData()
	if err != nil {
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
	students, err := h.service.GetStudentsReportData()
	if err != nil {
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
	activities, err := h.service.GetActivityReportData()
	if err != nil {
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
	stats, err := h.service.GetPerformanceStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stats"})
		return
	}

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

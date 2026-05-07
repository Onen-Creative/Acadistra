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

type ReportsHandler struct {
	service *services.ReportsService
}

func NewReportsHandler(service *services.ReportsService) *ReportsHandler {
	return &ReportsHandler{service: service}
}

func (h *ReportsHandler) GenerateStudentsReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	year := c.Query("year")
	term := c.Query("term")

	students, err := h.service.GetStudentsReportData(schoolID, classID, year, term)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	f := excelize.NewFile()
	sheet := "Students"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"#", "Admission No", "First Name", "Middle Name", "Last Name", "Gender", "Date of Birth", "Class", "Status", "Enrolled Date"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	for i, student := range students {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), student.AdmissionNo)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), student.FirstName)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), student.MiddleName)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), student.LastName)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), student.Gender)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), student.DateOfBirth)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), student.ClassName)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), student.Status)
		f.SetCellValue(sheet, fmt.Sprintf("J%d", row), student.CreatedAt.Format("2006-01-02"))
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=students-report-%s.xlsx", time.Now().Format("2006-01-02")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

func (h *ReportsHandler) GenerateStaffReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	role := c.Query("role")

	staff, err := h.service.GetStaffReportData(schoolID, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch staff"})
		return
	}

	f := excelize.NewFile()
	sheet := "Staff"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"#", "Employee ID", "First Name", "Last Name", "Email", "Phone", "Role", "Employment Type", "Status", "Date Hired"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	for i, s := range staff {
		row := i + 2
		dateHired := ""
		if s.DateHired != nil {
			dateHired = s.DateHired.Format("2006-01-02")
		}
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), s.EmployeeID)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), s.FirstName)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), s.LastName)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), s.Email)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), s.Phone)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), s.Role)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), s.EmploymentType)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), s.Status)
		f.SetCellValue(sheet, fmt.Sprintf("J%d", row), dateHired)
	}

	var buf bytes.Buffer
	f.Write(&buf)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=staff-report-%s.xlsx", time.Now().Format("2006-01-02")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

func (h *ReportsHandler) GenerateAttendanceReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	classID := c.Query("class_id")

	if startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start_date and end_date are required"})
		return
	}

	records, err := h.service.GetAttendanceReportData(schoolID, startDate, endDate, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance"})
		return
	}

	f := excelize.NewFile()
	sheet := "Attendance"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"#", "Student Name", "Admission No", "Class", "Total Days", "Present", "Absent", "Late", "Attendance %"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	for i, record := range records {
		row := i + 2
		percentage := 0.0
		if record.TotalDays > 0 {
			percentage = (float64(record.Present) / float64(record.TotalDays)) * 100
		}
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s %s", record.FirstName, record.LastName))
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), record.AdmissionNo)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), record.ClassName)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), record.TotalDays)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), record.Present)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), record.Absent)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), record.Late)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), fmt.Sprintf("%.2f%%", percentage))
	}

	var buf bytes.Buffer
	f.Write(&buf)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=attendance-report-%s.xlsx", time.Now().Format("2006-01-02")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

func (h *ReportsHandler) GeneratePerformanceReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	year := c.Query("year")
	term := c.Query("term")
	classID := c.Query("class_id")

	if year == "" || term == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "year and term are required"})
		return
	}

	results, err := h.service.GetPerformanceReportData(schoolID, year, term, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch results"})
		return
	}

	f := excelize.NewFile()
	sheet := "Performance"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"#", "Student Name", "Admission No", "Class", "Subject", "Papers", "P1", "P2", "P3", "P4", "Grade", "Remark"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	for i, result := range results {
		row := i + 2
		
		// Format papers display
		papersStr := fmt.Sprintf("%d", result.NumPapers)
		p1, p2, p3, p4 := "", "", "", ""
		if result.Paper1 != nil {
			p1 = fmt.Sprintf("%.0f", *result.Paper1)
		}
		if result.Paper2 != nil {
			p2 = fmt.Sprintf("%.0f", *result.Paper2)
		}
		if result.Paper3 != nil {
			p3 = fmt.Sprintf("%.0f", *result.Paper3)
		}
		if result.Paper4 != nil {
			p4 = fmt.Sprintf("%.0f", *result.Paper4)
		}
		
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s %s", result.FirstName, result.LastName))
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), result.AdmissionNo)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), result.ClassName)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), result.SubjectName)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), papersStr)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), p1)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), p2)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), p3)
		f.SetCellValue(sheet, fmt.Sprintf("J%d", row), p4)
		f.SetCellValue(sheet, fmt.Sprintf("K%d", row), result.FinalGrade)
		f.SetCellValue(sheet, fmt.Sprintf("L%d", row), result.ComputationReason)
	}

	var buf bytes.Buffer
	f.Write(&buf)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=performance-report-%s-%s-%s.xlsx", year, term, time.Now().Format("2006-01-02")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

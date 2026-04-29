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

type ReportsHandler struct {
	db *gorm.DB
}

func NewReportsHandler(db *gorm.DB) *ReportsHandler {
	return &ReportsHandler{db: db}
}

// Students Report
func (h *ReportsHandler) GenerateStudentsReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	year := c.Query("year")
	term := c.Query("term")

	query := h.db.Table("students").
		Select("students.*, classes.name as class_name").
		Joins("LEFT JOIN enrollments ON students.id = enrollments.student_id").
		Joins("LEFT JOIN classes ON enrollments.class_id = classes.id").
		Where("students.school_id = ?", schoolID)

	if classID != "" {
		query = query.Where("classes.id = ?", classID)
	}
	if year != "" {
		query = query.Where("classes.year = ?", year)
	}
	if term != "" {
		query = query.Where("classes.term = ?", term)
	}

	var students []struct {
		ID           string
		AdmissionNo  string `gorm:"column:admission_no"`
		FirstName    string `gorm:"column:first_name"`
		MiddleName   string `gorm:"column:middle_name"`
		LastName     string `gorm:"column:last_name"`
		Gender       string
		DateOfBirth  string `gorm:"column:date_of_birth"`
		ClassName    string `gorm:"column:class_name"`
		Status       string
		CreatedAt    time.Time
	}

	if err := query.Order("students.first_name ASC").Find(&students).Error; err != nil {
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

// Staff Report
func (h *ReportsHandler) GenerateStaffReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	role := c.Query("role")

	query := h.db.Table("staff").Where("school_id = ?", schoolID)
	if role != "" {
		query = query.Where("role = ?", role)
	}

	var staff []struct {
		EmployeeID     string `gorm:"column:employee_id"`
		FirstName      string `gorm:"column:first_name"`
		LastName       string `gorm:"column:last_name"`
		Email          string
		Phone          string
		Role           string
		Status         string
		EmploymentType string `gorm:"column:employment_type"`
		DateHired      *time.Time `gorm:"column:date_hired"`
	}

	if err := query.Order("first_name ASC").Find(&staff).Error; err != nil {
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

// Attendance Report
func (h *ReportsHandler) GenerateAttendanceReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	classID := c.Query("class_id")

	if startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start_date and end_date are required"})
		return
	}

	query := h.db.Table("attendance").
		Select("students.first_name, students.last_name, students.admission_no, classes.name as class_name, COUNT(*) as total_days, SUM(CASE WHEN attendance.status = 'present' THEN 1 ELSE 0 END) as present, SUM(CASE WHEN attendance.status = 'absent' THEN 1 ELSE 0 END) as absent, SUM(CASE WHEN attendance.status = 'late' THEN 1 ELSE 0 END) as late").
		Joins("JOIN students ON attendance.student_id = students.id").
		Joins("JOIN enrollments ON students.id = enrollments.student_id").
		Joins("JOIN classes ON enrollments.class_id = classes.id").
		Where("attendance.school_id = ? AND attendance.date BETWEEN ? AND ?", schoolID, startDate, endDate).
		Group("students.id, students.first_name, students.last_name, students.admission_no, classes.name")

	if classID != "" {
		query = query.Where("classes.id = ?", classID)
	}

	var records []struct {
		FirstName    string
		LastName     string
		AdmissionNo  string
		ClassName    string
		TotalDays    int
		Present      int
		Absent       int
		Late         int
	}

	if err := query.Scan(&records).Error; err != nil {
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

// Performance Report
func (h *ReportsHandler) GeneratePerformanceReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	year := c.Query("year")
	term := c.Query("term")
	classID := c.Query("class_id")

	if year == "" || term == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "year and term are required"})
		return
	}

	query := h.db.Table("subject_results").
		Select("students.first_name, students.last_name, students.admission_no, classes.name as class_name, standard_subjects.name as subject_name, subject_results.raw_marks, subject_results.final_grade").
		Joins("JOIN students ON subject_results.student_id = students.id").
		Joins("JOIN classes ON subject_results.class_id = classes.id").
		Joins("JOIN standard_subjects ON subject_results.subject_id = standard_subjects.id").
		Where("subject_results.school_id = ? AND subject_results.year = ? AND subject_results.term = ?", schoolID, year, term)

	if classID != "" {
		query = query.Where("classes.id = ?", classID)
	}

	var results []struct {
		FirstName   string
		LastName    string
		AdmissionNo string
		ClassName   string
		SubjectName string
		RawMarks    map[string]interface{} `gorm:"type:jsonb"`
		FinalGrade  string
	}

	if err := query.Order("classes.name, students.first_name").Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch results"})
		return
	}

	f := excelize.NewFile()
	sheet := "Performance"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"#", "Student Name", "Admission No", "Class", "Subject", "CA", "Exam", "Total", "Grade"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	for i, result := range results {
		row := i + 2
		ca := 0.0
		exam := 0.0
		total := 0.0
		if result.RawMarks != nil {
			if v, ok := result.RawMarks["ca"].(float64); ok {
				ca = v
			}
			if v, ok := result.RawMarks["exam"].(float64); ok {
				exam = v
			}
			if v, ok := result.RawMarks["total"].(float64); ok {
				total = v
			} else if v, ok := result.RawMarks["mark"].(float64); ok {
				total = v
			}
		}
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s %s", result.FirstName, result.LastName))
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), result.AdmissionNo)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), result.ClassName)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), result.SubjectName)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), ca)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), exam)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), total)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), result.FinalGrade)
	}

	var buf bytes.Buffer
	f.Write(&buf)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=performance-report-%s-%s-%s.xlsx", year, term, time.Now().Format("2006-01-02")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

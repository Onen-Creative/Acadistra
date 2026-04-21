package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type StudentExportHandler struct {
	db *gorm.DB
}

func NewStudentExportHandler(db *gorm.DB) *StudentExportHandler {
	return &StudentExportHandler{db: db}
}

func (h *StudentExportHandler) ExportStudents(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	query := h.db.Table("students").Where("students.school_id = ? AND students.deleted_at IS NULL", schoolID)

	// Apply filters
	level := c.Query("level")
	classID := c.Query("class_id")
	year := c.Query("year")
	term := c.Query("term")
	gender := c.Query("gender")
	search := c.Query("search")

	needsJoin := level != "" || classID != "" || year != "" || term != ""

	if needsJoin {
		query = query.Joins("INNER JOIN enrollments ON enrollments.student_id = students.id AND enrollments.status = 'active'")
		query = query.Joins("INNER JOIN classes ON classes.id = enrollments.class_id")

		if level != "" {
			query = query.Where("classes.level = ?", level)
		}
		if classID != "" {
			query = query.Where("enrollments.class_id = ?", classID)
		}
		if year != "" {
			query = query.Where("enrollments.year = ?", year)
		}
		if term != "" {
			query = query.Where("enrollments.term = ?", term)
		}
	}

	if gender != "" {
		query = query.Where("students.gender = ?", gender)
	}

	if search != "" {
		query = query.Where("(LOWER(students.first_name) LIKE LOWER(?) OR LOWER(students.middle_name) LIKE LOWER(?) OR LOWER(students.last_name) LIKE LOWER(?) OR LOWER(students.admission_no) LIKE LOWER(?))",
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	query = query.Select("DISTINCT students.*")

	var students []models.Student
	if err := query.Order("students.first_name, students.last_name").Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	// Load guardians and current class for each student
	for i := range students {
		h.db.Where("student_id = ?", students[i].ID).Find(&students[i].Guardians)

		var enrollment models.Enrollment
		if err := h.db.Preload("Class").Where("student_id = ? AND status = 'active'", students[i].ID).First(&enrollment).Error; err == nil {
			if enrollment.Class != nil {
				students[i].ClassName = enrollment.Class.Name
			}
		}
	}

	f := excelize.NewFile()
	sheetName := "Students"
	f.SetSheetName("Sheet1", sheetName)

	// Title
	titleText := "Student Records"
	if level != "" {
		titleText += fmt.Sprintf(" - %s", level)
	}
	if year != "" && term != "" {
		titleText += fmt.Sprintf(" (%s, %s)", year, term)
	}

	f.SetCellValue(sheetName, "A1", titleText)
	f.MergeCell(sheetName, "A1", "P1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheetName, "A1", "P1", titleStyle)
	f.SetRowHeight(sheetName, 1, 25)

	// Headers
	headers := []string{
		"No.", "Admission No", "First Name", "Middle Name", "Last Name", "Gender", "Date of Birth",
		"Class", "Status", "Email", "Phone", "Guardian Name", "Guardian Phone", "Guardian Relationship",
		"Address", "District",
	}

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"4472C4"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})

	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 3)
		f.SetCellValue(sheetName, cell, header)
		f.SetCellStyle(sheetName, cell, cell, headerStyle)
	}
	f.SetRowHeight(sheetName, 3, 30)

	dataStyle, _ := f.NewStyle(&excelize.Style{
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
		Alignment: &excelize.Alignment{Vertical: "center"},
	})

	// Data rows
	row := 4
	for idx, student := range students {
		col := 1

		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), idx+1)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.AdmissionNo)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.FirstName)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.MiddleName)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.LastName)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.Gender)
		col++
		if student.DateOfBirth != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.DateOfBirth.Format("2006-01-02"))
		}
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.ClassName)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.Status)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.Email)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.Phone)
		col++

		// Guardian info
		if len(student.Guardians) > 0 {
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.Guardians[0].FullName)
			col++
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.Guardians[0].Phone)
			col++
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.Guardians[0].Relationship)
			col++
		} else {
			col += 3
		}

		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.Address)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.District)

		startCell, _ := excelize.CoordinatesToCellName(1, row)
		endCell, _ := excelize.CoordinatesToCellName(len(headers), row)
		f.SetCellStyle(sheetName, startCell, endCell, dataStyle)
		row++
	}

	// Set column widths
	f.SetColWidth(sheetName, "A", "A", 5)
	f.SetColWidth(sheetName, "B", "B", 15)
	f.SetColWidth(sheetName, "C", "E", 18)
	f.SetColWidth(sheetName, "F", "F", 10)
	f.SetColWidth(sheetName, "G", "G", 15)
	f.SetColWidth(sheetName, "H", "I", 12)
	f.SetColWidth(sheetName, "J", "K", 20)
	f.SetColWidth(sheetName, "L", "N", 20)
	f.SetColWidth(sheetName, "O", "P", 25)

	filename := fmt.Sprintf("students_%s_%s_%s.xlsx", level, year, term)
	if level == "" {
		filename = "students_export.xlsx"
	}

	c.Writer.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Writer.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Writer.WriteHeader(http.StatusOK)
	f.Write(c.Writer)
}

func colNameFromInt(col int) string {
	name, _ := excelize.ColumnNumberToName(col)
	return name
}

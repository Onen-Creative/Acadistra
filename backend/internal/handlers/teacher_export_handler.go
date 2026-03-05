package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type TeacherExportHandler struct {
	db *gorm.DB
}

func NewTeacherExportHandler(db *gorm.DB) *TeacherExportHandler {
	return &TeacherExportHandler{db: db}
}

func (h *TeacherExportHandler) ExportTeachers(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	var teachers []models.Staff
	if err := h.db.Where("school_id = ? AND role = ?", schoolID, "Teacher").Order("first_name, last_name").Find(&teachers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch teachers"})
		return
	}

	f := excelize.NewFile()
	sheetName := "Teachers"
	f.SetSheetName("Sheet1", sheetName)

	// Title
	f.SetCellValue(sheetName, "A1", "Teacher Records")
	f.MergeCell(sheetName, "A1", "H1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheetName, "A1", "H1", titleStyle)
	f.SetRowHeight(sheetName, 1, 25)

	// Headers
	headers := []string{
		"No.", "Employee ID", "Full Name", "Gender", "Date of Birth", "Nationality", "National ID",
		"Email", "Phone", "Alternative Phone", "Address", "District", "Village",
		"Qualifications", "Specialization", "Experience (Years)", "Employment Type", "Date Joined",
		"Salary (UGX)", "Bank Name", "Bank Account", "Registration Number", "IPPS Number", "Supplier Number",
		"Emergency Contact", "Emergency Phone", "Status", "Notes",
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
	for idx, teacher := range teachers {
		col := 1
		fullName := teacher.FirstName
		if teacher.MiddleName != "" {
			fullName += " " + teacher.MiddleName
		}
		fullName += " " + teacher.LastName

		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), idx+1)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.EmployeeID)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), fullName)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Gender)
		col++
		if teacher.DateOfBirth != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.DateOfBirth.Format("2006-01-02"))
		}
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Nationality)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.NationalID)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Email)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Phone)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.AlternativePhone)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Address)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.District)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Village)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Qualifications)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Specialization)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Experience)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.EmploymentType)
		col++
		if teacher.DateJoined != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.DateJoined.Format("2006-01-02"))
		}
		col++
		if teacher.Salary > 0 {
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Salary)
		}
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.BankName)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.BankAccount)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.RegistrationNumber)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.IPPSNumber)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.SupplierNumber)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.EmergencyContact)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.EmergencyPhone)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Status)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colName(col), row), teacher.Notes)

		startCell, _ := excelize.CoordinatesToCellName(1, row)
		endCell, _ := excelize.CoordinatesToCellName(len(headers), row)
		f.SetCellStyle(sheetName, startCell, endCell, dataStyle)
		row++
	}

	// Set column widths
	f.SetColWidth(sheetName, "A", "A", 5)
	f.SetColWidth(sheetName, "B", "B", 12)
	f.SetColWidth(sheetName, "C", "C", 25)
	f.SetColWidth(sheetName, "D", "G", 15)
	f.SetColWidth(sheetName, "H", "I", 20)
	f.SetColWidth(sheetName, "J", "M", 15)
	f.SetColWidth(sheetName, "N", "N", 30)
	f.SetColWidth(sheetName, "O", "AB", 15)

	filename := "teachers_export.xlsx"
	c.Writer.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Writer.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Writer.WriteHeader(http.StatusOK)
	f.Write(c.Writer)
}

func colName(col int) string {
	name, _ := excelize.ColumnNumberToName(col)
	return name
}

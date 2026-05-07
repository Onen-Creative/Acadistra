package services

import (
	"fmt"

	"github.com/school-system/backend/internal/repositories"
	"github.com/xuri/excelize/v2"
)

type TeacherExportService struct {
	repo *repositories.TeacherExportRepository
}

func NewTeacherExportService(repo *repositories.TeacherExportRepository) *TeacherExportService {
	return &TeacherExportService{repo: repo}
}

func (s *TeacherExportService) ExportTeachersToExcel(schoolID string) (*excelize.File, error) {
	teachers, err := s.repo.FindTeachersBySchool(schoolID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch teachers: %w", err)
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

	return f, nil
}

func colName(col int) string {
	name, _ := excelize.ColumnNumberToName(col)
	return name
}

package services

import (
	"fmt"

	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"github.com/xuri/excelize/v2"
)

type StudentExportService struct {
	repo repositories.StudentExportRepository
}

func NewStudentExportService(repo repositories.StudentExportRepository) *StudentExportService {
	return &StudentExportService{repo: repo}
}

func (s *StudentExportService) ExportStudentsToExcel(schoolID, level, classID, year, term, gender, search string) (*excelize.File, error) {
	students, err := s.repo.FindStudentsWithFilters(schoolID, level, classID, year, term, gender, search)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch students: %w", err)
	}

	// Load guardians and current class for each student
	for i := range students {
		guardians, _ := s.repo.LoadGuardians(students[i].ID)
		students[i].Guardians = guardians

		enrollment, err := s.repo.LoadActiveEnrollment(students[i].ID)
		if err == nil && enrollment.Class != nil {
			students[i].ClassName = enrollment.Class.Name
		}
	}

	return s.generateExcelFile(students, level, year, term)
}

func (s *StudentExportService) generateExcelFile(students []models.Student, level, year, term string) (*excelize.File, error) {
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
		"No.", "Admission No", "SchoolPay Code", "First Name", "Middle Name", "Last Name", "Gender", "Date of Birth",
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
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", colNameFromInt(col), row), student.SchoolPayCode)
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

	return f, nil
}

func colNameFromInt(col int) string {
	name, _ := excelize.ColumnNumberToName(col)
	return name
}

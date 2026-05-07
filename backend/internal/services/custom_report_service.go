package services

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type CustomReportService struct {
	repo                *repositories.GeneratedReportRepository
	systemReportsRepo   *repositories.SystemReportsRepository
	db                  *gorm.DB
}

func NewCustomReportService(db *gorm.DB) *CustomReportService {
	return &CustomReportService{
		repo:              repositories.NewGeneratedReportRepository(db),
		systemReportsRepo: repositories.NewSystemReportsRepository(db),
		db:                db,
	}
}

type CustomReportParams struct {
	ReportType  string                 `json:"report_type"`
	ReportName  string                 `json:"report_name"`
	Description string                 `json:"description"`
	DateFrom    *time.Time             `json:"date_from"`
	DateTo      *time.Time             `json:"date_to"`
	SchoolID    *uuid.UUID             `json:"school_id"`
	Filters     map[string]interface{} `json:"filters"`
}

func (s *CustomReportService) GenerateCustomReport(params CustomReportParams, userID uuid.UUID) (*models.GeneratedReport, error) {
	// Create reports directory if it doesn't exist
	reportsDir := "./reports"
	if err := os.MkdirAll(reportsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create reports directory: %w", err)
	}

	// Generate filename
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("%s_%s.xlsx", params.ReportType, timestamp)
	filePath := filepath.Join(reportsDir, filename)

	// Generate Excel file based on report type
	var err error
	switch params.ReportType {
	case "schools":
		err = s.generateSchoolsReport(filePath, params)
	case "users":
		err = s.generateUsersReport(filePath, params)
	case "students":
		err = s.generateStudentsReport(filePath, params)
	case "activity":
		err = s.generateActivityReport(filePath, params)
	case "performance":
		err = s.generatePerformanceReport(filePath, params)
	case "custom":
		err = s.generateFullCustomReport(filePath, params)
	default:
		return nil, fmt.Errorf("unsupported report type: %s", params.ReportType)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to generate report: %w", err)
	}

	// Get file size
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info: %w", err)
	}

	// Set expiration (30 days from now)
	expiresAt := time.Now().AddDate(0, 0, 30)

	// Save report metadata
	report := &models.GeneratedReport{
		SchoolID:    params.SchoolID,
		ReportType:  params.ReportType,
		ReportName:  params.ReportName,
		Description: params.Description,
		FilePath:    filePath,
		FileSize:    fileInfo.Size(),
		Format:      "xlsx",
		Parameters:  models.JSONB(params.Filters),
		GeneratedBy: userID,
		GeneratedAt: time.Now(),
		ExpiresAt:   &expiresAt,
	}

	if err := s.repo.Create(report); err != nil {
		return nil, fmt.Errorf("failed to save report metadata: %w", err)
	}

	return report, nil
}

func (s *CustomReportService) generateSchoolsReport(filePath string, _ CustomReportParams) error {
	data, err := s.systemReportsRepo.GetSchoolsData()
	if err != nil {
		return err
	}

	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Schools"
	f.SetSheetName("Sheet1", sheetName)

	// Headers
	headers := []string{"ID", "Name", "Type", "Status", "Created At"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// Data
	for i, school := range data {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), school.ID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), school.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), school.Type)
		status := "Inactive"
		if school.IsActive {
			status = "Active"
		}
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), status)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), school.CreatedAt.Format("2006-01-02"))
	}

	return f.SaveAs(filePath)
}

func (s *CustomReportService) generateUsersReport(filePath string, _ CustomReportParams) error {
	data, err := s.systemReportsRepo.GetUsersData()
	if err != nil {
		return err
	}

	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Users"
	f.SetSheetName("Sheet1", sheetName)

	headers := []string{"ID", "Email", "Name", "Role", "Status", "Created At"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	for i, user := range data {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), user.ID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), user.Email)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), user.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), user.Role)
		status := "Inactive"
		if user.IsActive {
			status = "Active"
		}
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), status)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), user.CreatedAt.Format("2006-01-02"))
	}

	return f.SaveAs(filePath)
}

func (s *CustomReportService) generateStudentsReport(filePath string, _ CustomReportParams) error {
	data, err := s.systemReportsRepo.GetStudentsData()
	if err != nil {
		return err
	}

	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Students"
	f.SetSheetName("Sheet1", sheetName)

	headers := []string{"ID", "Name", "Admission No", "Class Level", "School", "Created At"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	for i, student := range data {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), student.ID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), student.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), student.AdmissionNo)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), student.ClassLevel)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), student.SchoolName)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), student.CreatedAt.Format("2006-01-02"))
	}

	return f.SaveAs(filePath)
}

func (s *CustomReportService) generateActivityReport(filePath string, _ CustomReportParams) error {
	data, err := s.systemReportsRepo.GetActivityData()
	if err != nil {
		return err
	}

	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Activity"
	f.SetSheetName("Sheet1", sheetName)

	headers := []string{"ID", "Action", "User Email", "Timestamp"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	for i, activity := range data {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), activity.ID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), activity.Action)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), activity.UserEmail)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), activity.Timestamp.Format("2006-01-02 15:04:05"))
	}

	return f.SaveAs(filePath)
}

func (s *CustomReportService) generatePerformanceReport(filePath string, _ CustomReportParams) error {
	stats, err := s.systemReportsRepo.GetPerformanceStats()
	if err != nil {
		return err
	}

	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Performance"
	f.SetSheetName("Sheet1", sheetName)

	f.SetCellValue(sheetName, "A1", "Metric")
	f.SetCellValue(sheetName, "B1", "Value")

	f.SetCellValue(sheetName, "A2", "Total Schools")
	f.SetCellValue(sheetName, "B2", stats.TotalSchools)

	f.SetCellValue(sheetName, "A3", "Active Schools")
	f.SetCellValue(sheetName, "B3", stats.ActiveSchools)

	f.SetCellValue(sheetName, "A4", "Total Users")
	f.SetCellValue(sheetName, "B4", stats.TotalUsers)

	f.SetCellValue(sheetName, "A5", "Active Users")
	f.SetCellValue(sheetName, "B5", stats.ActiveUsers)

	f.SetCellValue(sheetName, "A6", "Total Students")
	f.SetCellValue(sheetName, "B6", stats.TotalStudents)

	return f.SaveAs(filePath)
}

func (s *CustomReportService) generateFullCustomReport(filePath string, params CustomReportParams) error {
	// This would be a fully customizable report based on user selections
	// For now, generate a combined report
	f := excelize.NewFile()
	defer f.Close()

	// Add multiple sheets based on filters
	if params.Filters["include_schools"] == true {
		s.addSchoolsSheet(f)
	}
	if params.Filters["include_users"] == true {
		s.addUsersSheet(f)
	}
	if params.Filters["include_students"] == true {
		s.addStudentsSheet(f)
	}

	return f.SaveAs(filePath)
}

func (s *CustomReportService) addSchoolsSheet(f *excelize.File) error {
	data, _ := s.systemReportsRepo.GetSchoolsData()
	sheetName := "Schools"
	f.NewSheet(sheetName)
	
	headers := []string{"ID", "Name", "Type", "Status"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}
	
	for i, school := range data {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), school.ID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), school.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), school.Type)
		status := "Inactive"
		if school.IsActive {
			status = "Active"
		}
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), status)
	}
	
	return nil
}

func (s *CustomReportService) addUsersSheet(f *excelize.File) error {
	data, _ := s.systemReportsRepo.GetUsersData()
	sheetName := "Users"
	f.NewSheet(sheetName)
	
	headers := []string{"Email", "Name", "Role"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}
	
	for i, user := range data {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), user.Email)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), user.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), user.Role)
	}
	
	return nil
}

func (s *CustomReportService) addStudentsSheet(f *excelize.File) error {
	data, _ := s.systemReportsRepo.GetStudentsData()
	sheetName := "Students"
	f.NewSheet(sheetName)
	
	headers := []string{"Name", "Admission No", "School"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}
	
	for i, student := range data {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), student.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), student.AdmissionNo)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), student.SchoolName)
	}
	
	return nil
}

func (s *CustomReportService) ListReports(schoolID *uuid.UUID, limit int) ([]models.GeneratedReport, error) {
	return s.repo.List(schoolID, limit)
}

func (s *CustomReportService) GetReport(id uuid.UUID) (*models.GeneratedReport, error) {
	return s.repo.GetByID(id)
}

func (s *CustomReportService) DeleteReport(id uuid.UUID) error {
	report, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	// Delete file
	if err := os.Remove(report.FilePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete report file: %w", err)
	}

	// Delete metadata
	return s.repo.Delete(id)
}

func (s *CustomReportService) CleanupExpiredReports() error {
	return s.repo.DeleteExpired()
}

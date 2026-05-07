package services

import (
	"github.com/school-system/backend/internal/repositories"
)

type ReportsService struct {
	repo repositories.ReportsRepository
}

func NewReportsService(repo repositories.ReportsRepository) *ReportsService {
	return &ReportsService{repo: repo}
}

// Type aliases to avoid exposing repository types
type StudentReportData = repositories.StudentReportData
type StaffReportData = repositories.StaffReportData
type AttendanceReportData = repositories.AttendanceReportData
type PerformanceReportData = repositories.PerformanceReportData

func (s *ReportsService) GetStudentsReportData(schoolID, classID, year, term string) ([]StudentReportData, error) {
	return s.repo.GetStudentsReportData(schoolID, classID, year, term)
}

func (s *ReportsService) GetStaffReportData(schoolID, role string) ([]StaffReportData, error) {
	return s.repo.GetStaffReportData(schoolID, role)
}

func (s *ReportsService) GetAttendanceReportData(schoolID, startDate, endDate, classID string) ([]AttendanceReportData, error) {
	return s.repo.GetAttendanceReportData(schoolID, startDate, endDate, classID)
}

func (s *ReportsService) GetPerformanceReportData(schoolID, year, term, classID string) ([]PerformanceReportData, error) {
	return s.repo.GetPerformanceReportData(schoolID, year, term, classID)
}

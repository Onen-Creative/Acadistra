package services

import (
	"github.com/school-system/backend/internal/repositories"
)

type SystemReportsService struct {
	repo *repositories.SystemReportsRepository
}

func NewSystemReportsService(repo *repositories.SystemReportsRepository) *SystemReportsService {
	return &SystemReportsService{repo: repo}
}

func (s *SystemReportsService) GetSchoolsReportData() ([]repositories.SystemSchoolReportData, error) {
	return s.repo.GetSchoolsData()
}

func (s *SystemReportsService) GetUsersReportData() ([]repositories.SystemUserReportData, error) {
	return s.repo.GetUsersData()
}

func (s *SystemReportsService) GetStudentsReportData() ([]repositories.SystemStudentReportData, error) {
	return s.repo.GetStudentsData()
}

func (s *SystemReportsService) GetActivityReportData() ([]repositories.SystemActivityReportData, error) {
	return s.repo.GetActivityData()
}

func (s *SystemReportsService) GetPerformanceStats() (*repositories.SystemPerformanceStats, error) {
	return s.repo.GetPerformanceStats()
}

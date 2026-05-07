package services

import (
	"fmt"
	"github.com/xuri/excelize/v2"
	"github.com/google/uuid"
)

type AnalyticsExportService struct {
	analyticsService *AnalyticsService
}

func NewAnalyticsExportService(analyticsService *AnalyticsService) *AnalyticsExportService {
	return &AnalyticsExportService{
		analyticsService: analyticsService,
	}
}

// ExportGradeAnalyticsToXLSX exports grade performance analytics to Excel
func (s *AnalyticsExportService) ExportGradeAnalyticsToXLSX(schoolID uuid.UUID, filters AnalyticsFilters) (*excelize.File, error) {
	// Get analytics data
	analytics, err := s.analyticsService.GetGradePerformanceAnalytics(schoolID, filters)
	if err != nil {
		return nil, err
	}

	// Create new Excel file
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			fmt.Println(err)
		}
	}()

	// Create sheets
	f.SetSheetName("Sheet1", "Overview")
	f.NewSheet("Subject Performance")
	f.NewSheet("Grade Distribution")
	f.NewSheet("Top Performers")

	// Styles
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 12, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"4472C4"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})

	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})

	// 1. Overview Sheet
	s.createOverviewSheet(f, analytics, titleStyle, headerStyle)

	// 2. Subject Performance Sheet
	s.createSubjectPerformanceSheet(f, analytics, titleStyle, headerStyle)

	// 3. Grade Distribution Sheet
	s.createGradeDistributionSheet(f, analytics, titleStyle, headerStyle)

	// 4. Top Performers Sheet (if not Advanced Level)
	isAdvancedLevel := analytics.GradeContext.Level == "S5" || analytics.GradeContext.Level == "S6"
	if !isAdvancedLevel && len(analytics.TopPerformers) > 0 {
		s.createTopPerformersSheet(f, analytics, titleStyle, headerStyle)
	}

	// 5. Advanced Level Student Details (if Advanced Level)
	if isAdvancedLevel && len(analytics.StudentDetails) > 0 {
		f.NewSheet("Student Rankings")
		s.createAdvancedLevelSheet(f, analytics, titleStyle, headerStyle)
	}

	// Set active sheet
	f.SetActiveSheet(0)

	return f, nil
}

func (s *AnalyticsExportService) createOverviewSheet(f *excelize.File, analytics *GradePerformanceAnalytics, titleStyle, headerStyle int) {
	sheet := "Overview"

	// Title
	f.SetCellValue(sheet, "A1", fmt.Sprintf("%s - Performance Analytics", analytics.GradeContext.ClassName))
	f.MergeCell(sheet, "A1", "D1")
	f.SetCellStyle(sheet, "A1", "D1", titleStyle)
	f.SetRowHeight(sheet, 1, 25)

	// Class Info
	row := 3
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Academic Year:")
	f.SetCellValue(sheet, fmt.Sprintf("B%d", row), analytics.GradeContext.Year)
	row++
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Term:")
	f.SetCellValue(sheet, fmt.Sprintf("B%d", row), analytics.GradeContext.Term)
	row++
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Class:")
	f.SetCellValue(sheet, fmt.Sprintf("B%d", row), analytics.GradeContext.ClassName)
	row++
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Total Students:")
	f.SetCellValue(sheet, fmt.Sprintf("B%d", row), analytics.GradeContext.TotalStudents)
	row += 2

	// Grade Summary
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Grade Summary")
	f.MergeCell(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("C%d", row))
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("C%d", row), titleStyle)
	row++

	// Headers
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Grade")
	f.SetCellValue(sheet, fmt.Sprintf("B%d", row), "Count")
	f.SetCellValue(sheet, fmt.Sprintf("C%d", row), "Percentage")
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("C%d", row), headerStyle)
	row++

	// Grade data
	totalGrades := 0
	for _, count := range analytics.GradeContext.GradeSummary {
		totalGrades += count
	}

	for grade, count := range analytics.GradeContext.GradeSummary {
		if count > 0 {
			percentage := float64(count) / float64(totalGrades) * 100
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), grade)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), count)
			f.SetCellValue(sheet, fmt.Sprintf("C%d", row), fmt.Sprintf("%.1f%%", percentage))
			row++
		}
	}

	// Insights
	row += 2
	f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Key Insights")
	f.MergeCell(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row))
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row), titleStyle)
	row++

	for _, insight := range analytics.GradeInsights {
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), insight)
		f.MergeCell(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row))
		row++
	}

	// Set column widths
	f.SetColWidth(sheet, "A", "A", 20)
	f.SetColWidth(sheet, "B", "D", 15)
}

func (s *AnalyticsExportService) createSubjectPerformanceSheet(f *excelize.File, analytics *GradePerformanceAnalytics, titleStyle, headerStyle int) {
	sheet := "Subject Performance"

	// Title
	f.SetCellValue(sheet, "A1", "Subject Performance Summary")
	f.MergeCell(sheet, "A1", "H1")
	f.SetCellStyle(sheet, "A1", "H1", titleStyle)
	f.SetRowHeight(sheet, 1, 25)

	// Headers
	row := 3
	headers := []string{"Rank", "Subject", "Average Score", "Highest", "Lowest", "Pass Rate", "Students", "Trend"}
	for i, header := range headers {
		col := string(rune('A' + i))
		f.SetCellValue(sheet, fmt.Sprintf("%s%d", col, row), header)
	}
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("H%d", row), headerStyle)
	row++

	// Data
	for _, subject := range analytics.SubjectRanking {
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), subject.Rank)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), subject.SubjectName)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), fmt.Sprintf("%.1f%%", subject.AverageScore))
		
		// Find highest and lowest from subject overview
		for _, overview := range analytics.SubjectOverview {
			if overview.SubjectName == subject.SubjectName {
				f.SetCellValue(sheet, fmt.Sprintf("D%d", row), fmt.Sprintf("%.1f%%", overview.HighestScore))
				f.SetCellValue(sheet, fmt.Sprintf("E%d", row), fmt.Sprintf("%.1f%%", overview.LowestScore))
				f.SetCellValue(sheet, fmt.Sprintf("G%d", row), overview.StudentCount)
				break
			}
		}
		
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), fmt.Sprintf("%.1f%%", subject.PassRate))
		
		// Trend
		trend := "—"
		if subject.AverageChange != nil {
			if *subject.AverageChange > 0 {
				trend = fmt.Sprintf("↑ %.1f%%", *subject.AverageChange)
			} else if *subject.AverageChange < 0 {
				trend = fmt.Sprintf("↓ %.1f%%", -*subject.AverageChange)
			}
		}
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), trend)
		row++
	}

	// Set column widths
	f.SetColWidth(sheet, "A", "A", 8)
	f.SetColWidth(sheet, "B", "B", 25)
	f.SetColWidth(sheet, "C", "H", 15)
}

func (s *AnalyticsExportService) createGradeDistributionSheet(f *excelize.File, analytics *GradePerformanceAnalytics, titleStyle, headerStyle int) {
	sheet := "Grade Distribution"

	// Title
	f.SetCellValue(sheet, "A1", "Grade Distribution by Subject")
	f.MergeCell(sheet, "A1", "L1")
	f.SetCellStyle(sheet, "A1", "L1", titleStyle)
	f.SetRowHeight(sheet, 1, 25)

	row := 3
	isAdvancedLevel := analytics.GradeContext.Level == "S5" || analytics.GradeContext.Level == "S6"
	isOLevel := analytics.GradeContext.Level == "S1" || analytics.GradeContext.Level == "S2" || 
				analytics.GradeContext.Level == "S3" || analytics.GradeContext.Level == "S4"
	isPrimary := analytics.GradeContext.Level == "P1" || analytics.GradeContext.Level == "P2" || 
				 analytics.GradeContext.Level == "P3" || analytics.GradeContext.Level == "P4" || 
				 analytics.GradeContext.Level == "P5" || analytics.GradeContext.Level == "P6" || 
				 analytics.GradeContext.Level == "P7"
	isNursery := analytics.GradeContext.Level == "Baby" || analytics.GradeContext.Level == "Middle" || 
				 analytics.GradeContext.Level == "Top"

	// Headers based on level
	headers := []string{"Subject"}
	if isAdvancedLevel {
		headers = append(headers, "A", "B", "C", "D", "E", "O", "F")
	} else if isOLevel {
		headers = append(headers, "A", "B", "C", "D", "E")
	} else if isPrimary {
		headers = append(headers, "D1", "D2", "C3", "C4", "C5", "C6", "P7", "P8", "F9")
	} else if isNursery {
		headers = append(headers, "Mastering", "Secure", "Developing", "Emerging", "Not Yet")
	}

	for i, header := range headers {
		col := string(rune('A' + i))
		f.SetCellValue(sheet, fmt.Sprintf("%s%d", col, row), header)
	}
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("%s%d", string(rune('A'+len(headers)-1)), row), headerStyle)
	row++

	// Data
	for subjectName, dist := range analytics.GradeDistribution {
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), subjectName)
		
		col := 1
		if isAdvancedLevel {
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.A)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.B)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.C)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.D)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.E)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.O)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.F)
		} else if isOLevel {
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.A)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.B)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.C)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.D)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.E)
		} else if isPrimary {
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.D1)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.D2)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.C3)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.C4)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.C5)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.C6)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.P7)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.P8)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.F9)
		} else if isNursery {
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.Mastering)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.Secure)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.Developing)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.Emerging)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", string(rune('A'+col)), row), dist.NotYet)
		}
		row++
	}

	// Set column widths
	f.SetColWidth(sheet, "A", "A", 25)
	f.SetColWidth(sheet, "B", "L", 12)
}

func (s *AnalyticsExportService) createTopPerformersSheet(f *excelize.File, analytics *GradePerformanceAnalytics, titleStyle, headerStyle int) {
	sheet := "Top Performers"

	// Title
	f.SetCellValue(sheet, "A1", "Top Performers by Subject")
	f.MergeCell(sheet, "A1", "D1")
	f.SetCellStyle(sheet, "A1", "D1", titleStyle)
	f.SetRowHeight(sheet, 1, 25)

	row := 3
	for subjectName, performers := range analytics.TopPerformers {
		// Subject header
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), subjectName)
		f.MergeCell(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row))
		f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row), titleStyle)
		row++

		// Column headers
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), "Rank")
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), "Student Name")
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), "Score")
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), "Grade")
		f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row), headerStyle)
		row++

		// Performers
		for i, student := range performers {
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), student.StudentName)
			f.SetCellValue(sheet, fmt.Sprintf("C%d", row), fmt.Sprintf("%.1f%%", student.Score))
			f.SetCellValue(sheet, fmt.Sprintf("D%d", row), student.Grade)
			row++
		}
		row++ // Space between subjects
	}

	// Set column widths
	f.SetColWidth(sheet, "A", "A", 8)
	f.SetColWidth(sheet, "B", "B", 30)
	f.SetColWidth(sheet, "C", "D", 15)
}

func (s *AnalyticsExportService) createAdvancedLevelSheet(f *excelize.File, analytics *GradePerformanceAnalytics, titleStyle, headerStyle int) {
	sheet := "Student Rankings"

	// Title
	f.SetCellValue(sheet, "A1", "Advanced Level Student Rankings")
	f.MergeCell(sheet, "A1", "G1")
	f.SetCellStyle(sheet, "A1", "G1", titleStyle)
	f.SetRowHeight(sheet, 1, 25)

	// Headers
	row := 3
	headers := []string{"Rank", "Student Name", "Admission No", "Gender", "Total Points", "Average Marks", "Overall Grade"}
	for i, header := range headers {
		col := string(rune('A' + i))
		f.SetCellValue(sheet, fmt.Sprintf("%s%d", col, row), header)
	}
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("G%d", row), headerStyle)
	row++

	// Data
	for _, student := range analytics.StudentDetails {
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), student.Rank)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), student.StudentName)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), student.AdmissionNo)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), student.Gender)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), student.TotalPoints)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), fmt.Sprintf("%.1f%%", student.AverageMarks))
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), student.OverallGrade)
		row++
	}

	// Set column widths
	f.SetColWidth(sheet, "A", "A", 8)
	f.SetColWidth(sheet, "B", "B", 30)
	f.SetColWidth(sheet, "C", "D", 15)
	f.SetColWidth(sheet, "E", "G", 15)
}

package services

import (
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"github.com/xuri/excelize/v2"
)

type ClassRankingService struct {
	repo repositories.ClassRankingRepository
}

func NewClassRankingService(repo repositories.ClassRankingRepository) *ClassRankingService {
	return &ClassRankingService{repo: repo}
}

type StudentRanking struct {
	StudentID     string  `json:"student_id"`
	AdmissionNo   string  `json:"admission_no"`
	StudentName   string  `json:"student_name"`
	Gender        string  `json:"gender"`
	Aggregate     *int    `json:"aggregate,omitempty"`
	AverageMarks  float64 `json:"average_marks"`
	TotalPoints   *int    `json:"total_points,omitempty"`
	SubjectsCount int     `json:"subjects_count"`
	Rank          int     `json:"rank"`
	Division      string  `json:"division,omitempty"`
	Grade         string  `json:"grade,omitempty"`
}

type ClassRankingResponse struct {
	ClassID       string           `json:"class_id"`
	ClassName     string           `json:"class_name"`
	Level         string           `json:"level"`
	Term          string           `json:"term"`
	Year          string           `json:"year"`
	ExamType      string           `json:"exam_type"`
	TotalStudents int              `json:"total_students"`
	Rankings      []StudentRanking `json:"rankings"`
}

func (s *ClassRankingService) GetClassRanking(classID, term, year, examType string) (*ClassRankingResponse, error) {
	class, err := s.repo.FindClassByID(classID)
	if err != nil {
		return nil, fmt.Errorf("class not found")
	}

	students, err := s.repo.FindStudentsByClassID(classID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch students")
	}

	if len(students) == 0 {
		return &ClassRankingResponse{
			ClassID:       classID,
			ClassName:     class.Name,
			Level:         class.Level,
			Term:          term,
			Year:          year,
			ExamType:      examType,
			TotalStudents: 0,
			Rankings:      []StudentRanking{},
		}, nil
	}

	levelCategory := determineLevelCategory(class.Level)
	var rankings []StudentRanking

	yearInt := 0
	fmt.Sscanf(year, "%d", &yearInt)

	switch levelCategory {
	case "nursery":
		rankings, err = s.getNurseryRankings(students, term, yearInt, examType)
	case "primary":
		rankings, err = s.getPrimaryRankings(students, term, yearInt, examType)
	case "ordinary":
		rankings, err = s.getOrdinaryRankings(students, term, yearInt, examType)
	case "advanced":
		rankings, err = s.getAdvancedRankings(students, term, yearInt, examType)
	default:
		return nil, fmt.Errorf("unknown level category")
	}

	if err != nil {
		return nil, err
	}

	return &ClassRankingResponse{
		ClassID:       classID,
		ClassName:     class.Name,
		Level:         class.Level,
		Term:          term,
		Year:          year,
		ExamType:      examType,
		TotalStudents: len(rankings),
		Rankings:      rankings,
	}, nil
}

func (s *ClassRankingService) ExportClassRanking(classID, term, year, examType string) (*excelize.File, string, error) {
	response, err := s.GetClassRanking(classID, term, year, examType)
	if err != nil {
		return nil, "", err
	}

	f := excelize.NewFile()
	sheet := "Class Rankings"
	f.SetSheetName("Sheet1", sheet)

	// Title
	f.SetCellValue(sheet, "A1", fmt.Sprintf("Class Rankings - %s", response.ClassName))
	f.MergeCell(sheet, "A1", "H1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, "A1", "H1", titleStyle)

	// Subtitle
	f.SetCellValue(sheet, "A2", fmt.Sprintf("Term: %s | Year: %s | Exam: %s", term, year, examType))
	f.MergeCell(sheet, "A2", "H2")
	f.SetCellStyle(sheet, "A2", "H2", titleStyle)

	// Headers
	levelCategory := determineLevelCategory(response.Level)
	headers := []string{"Rank", "Admission No", "Student Name", "Gender"}

	switch levelCategory {
	case "nursery":
		headers = append(headers, "Average Marks", "Subjects")
	case "primary":
		headers = append(headers, "Aggregate", "Average Marks", "Division", "Subjects")
	case "ordinary":
		headers = append(headers, "Average Marks", "Grade", "Subjects")
	case "advanced":
		headers = append(headers, "Total Points", "Average Marks", "Subjects")
	}

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
	})

	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 4)
		f.SetCellValue(sheet, cell, header)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	// Data
	row := 5
	for _, ranking := range response.Rankings {
		col := 1
		f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), ranking.Rank)
		col++
		f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), ranking.AdmissionNo)
		col++
		f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), ranking.StudentName)
		col++
		f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), ranking.Gender)
		col++

		switch levelCategory {
		case "nursery":
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), fmt.Sprintf("%.1f", ranking.AverageMarks))
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), ranking.SubjectsCount)
		case "primary":
			if ranking.Aggregate != nil {
				f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), *ranking.Aggregate)
			}
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), fmt.Sprintf("%.1f", ranking.AverageMarks))
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), ranking.Division)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), ranking.SubjectsCount)
		case "ordinary":
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), fmt.Sprintf("%.1f", ranking.AverageMarks))
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), ranking.Grade)
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), ranking.SubjectsCount)
		case "advanced":
			if ranking.TotalPoints != nil {
				f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), *ranking.TotalPoints)
			}
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), fmt.Sprintf("%.1f", ranking.AverageMarks))
			col++
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", columnLetter(col), row), ranking.SubjectsCount)
		}
		row++
	}

	// Set column widths
	for i := 1; i <= len(headers); i++ {
		col, _ := excelize.ColumnNumberToName(i)
		f.SetColWidth(sheet, col, col, 15)
	}

	filename := fmt.Sprintf("Class_Rankings_%s_%s_%s_%s.xlsx", response.ClassName, term, year, time.Now().Format("20060102"))
	return f, filename, nil
}

func (s *ClassRankingService) GetAvailableTermsYears(classID string) ([]map[string]interface{}, error) {
	return s.repo.FindAvailableTermsYears(classID)
}

// Helper functions for different level rankings

func (s *ClassRankingService) getNurseryRankings(students []models.Student, term string, year int, examType string) ([]StudentRanking, error) {
	studentIDs := make([]uuid.UUID, len(students))
	studentMap := make(map[string]models.Student)
	for i, student := range students {
		studentIDs[i] = student.ID
		studentMap[student.ID.String()] = student
	}

	results, err := s.repo.FindResultsByStudentsAndTerm(studentIDs, term, year, examType)
	if err != nil {
		return nil, err
	}

	studentResults := make(map[string][]models.SubjectResult)
	for _, result := range results {
		sid := result.StudentID.String()
		studentResults[sid] = append(studentResults[sid], result)
	}

	rankings := []StudentRanking{}
	for studentID, results := range studentResults {
		if len(results) == 0 {
			continue
		}

		student := studentMap[studentID]
		totalMarks := 0.0
		count := 0
		for _, result := range results {
			if result.RawMarks != nil {
				if mark, ok := result.RawMarks["mark"].(float64); ok && mark > 0 {
					totalMarks += mark
					count++
				}
			}
		}

		if count == 0 {
			continue
		}

		avgMarks := totalMarks / float64(count)
		rankings = append(rankings, StudentRanking{
			StudentID:     student.ID.String(),
			AdmissionNo:   student.AdmissionNo,
			StudentName:   fmt.Sprintf("%s %s %s", student.FirstName, student.MiddleName, student.LastName),
			Gender:        student.Gender,
			AverageMarks:  avgMarks,
			SubjectsCount: count,
		})
	}

	sort.Slice(rankings, func(i, j int) bool {
		return rankings[i].AverageMarks > rankings[j].AverageMarks
	})

	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	return rankings, nil
}

func (s *ClassRankingService) getPrimaryRankings(students []models.Student, term string, year int, examType string) ([]StudentRanking, error) {
	studentIDs := make([]uuid.UUID, len(students))
	studentMap := make(map[string]models.Student)
	for i, student := range students {
		studentIDs[i] = student.ID
		studentMap[student.ID.String()] = student
	}

	results, err := s.repo.FindResultsByStudentsAndTerm(studentIDs, term, year, examType)
	if err != nil {
		return nil, err
	}

	studentResults := make(map[string][]models.SubjectResult)
	for _, result := range results {
		sid := result.StudentID.String()
		studentResults[sid] = append(studentResults[sid], result)
	}

	rankings := []StudentRanking{}
	for studentID, results := range studentResults {
		if len(results) == 0 {
			continue
		}

		student := studentMap[studentID]
		totalMarks := 0.0
		aggregate := 0
		count := 0

		for _, result := range results {
			if result.RawMarks != nil {
				ca := getFloatValue(result.RawMarks["ca"])
				exam := getFloatValue(result.RawMarks["exam"])

				if ca > 0 || exam > 0 {
					percentage := ((ca / 40) * 40) + ((exam / 60) * 60)
					totalMarks += percentage

					gradePoints := gradeToAggregate(result.FinalGrade, percentage)
					aggregate += gradePoints
					count++
				}
			}
		}

		if count == 0 {
			continue
		}

		avgMarks := totalMarks / float64(count)
		division := calculateDivision(aggregate)

		rankings = append(rankings, StudentRanking{
			StudentID:     student.ID.String(),
			AdmissionNo:   student.AdmissionNo,
			StudentName:   fmt.Sprintf("%s %s %s", student.FirstName, student.MiddleName, student.LastName),
			Gender:        student.Gender,
			Aggregate:     &aggregate,
			AverageMarks:  avgMarks,
			SubjectsCount: count,
			Division:      division,
		})
	}

	sort.Slice(rankings, func(i, j int) bool {
		if *rankings[i].Aggregate == *rankings[j].Aggregate {
			return rankings[i].AverageMarks > rankings[j].AverageMarks
		}
		return *rankings[i].Aggregate < *rankings[j].Aggregate
	})

	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	return rankings, nil
}

func (s *ClassRankingService) getOrdinaryRankings(students []models.Student, term string, year int, examType string) ([]StudentRanking, error) {
	studentIDs := make([]uuid.UUID, len(students))
	studentMap := make(map[string]models.Student)
	for i, student := range students {
		studentIDs[i] = student.ID
		studentMap[student.ID.String()] = student
	}

	results, err := s.repo.FindResultsByStudentsAndTerm(studentIDs, term, year, examType)
	if err != nil {
		return nil, err
	}

	studentResults := make(map[string][]models.SubjectResult)
	for _, result := range results {
		sid := result.StudentID.String()
		studentResults[sid] = append(studentResults[sid], result)
	}

	rankings := []StudentRanking{}
	for studentID, results := range studentResults {
		if len(results) == 0 {
			continue
		}

		student := studentMap[studentID]
		totalMarks := 0.0
		count := 0

		for _, result := range results {
			if result.RawMarks != nil {
				ca := getFloatValue(result.RawMarks["ca"])
				exam := getFloatValue(result.RawMarks["exam"])

				if ca > 0 || exam > 0 {
					percentage := ((ca / 20) * 20) + ((exam / 80) * 80)
					totalMarks += percentage
					count++
				}
			}
		}

		if count == 0 {
			continue
		}

		avgMarks := totalMarks / float64(count)
		grade := calculateOrdinaryGrade(avgMarks)

		rankings = append(rankings, StudentRanking{
			StudentID:     student.ID.String(),
			AdmissionNo:   student.AdmissionNo,
			StudentName:   fmt.Sprintf("%s %s %s", student.FirstName, student.MiddleName, student.LastName),
			Gender:        student.Gender,
			AverageMarks:  avgMarks,
			SubjectsCount: count,
			Grade:         grade,
		})
	}

	sort.Slice(rankings, func(i, j int) bool {
		return rankings[i].AverageMarks > rankings[j].AverageMarks
	})

	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	return rankings, nil
}

func (s *ClassRankingService) getAdvancedRankings(students []models.Student, term string, year int, examType string) ([]StudentRanking, error) {
	studentIDs := make([]uuid.UUID, len(students))
	studentMap := make(map[string]models.Student)
	for i, student := range students {
		studentIDs[i] = student.ID
		studentMap[student.ID.String()] = student
	}

	results, err := s.repo.FindResultsByStudentsAndTerm(studentIDs, term, year, examType)
	if err != nil {
		return nil, err
	}

	studentResults := make(map[string][]models.SubjectResult)
	for _, result := range results {
		sid := result.StudentID.String()
		studentResults[sid] = append(studentResults[sid], result)
	}

	rankings := []StudentRanking{}
	for studentID, results := range studentResults {
		if len(results) == 0 {
			continue
		}

		student := studentMap[studentID]
		totalPoints := 0
		totalMarks := 0.0
		count := 0

		subjectResults := make(map[string][]models.SubjectResult)
		for _, result := range results {
			subjectID := result.SubjectID.String()
			subjectResults[subjectID] = append(subjectResults[subjectID], result)
		}

		for _, subjectRes := range subjectResults {
			if len(subjectRes) == 0 {
				continue
			}

			subject, err := s.repo.FindSubjectByID(subjectRes[0].SubjectID)
			if err != nil {
				continue
			}

			isSubsidiary := contains([]string{"ICT", "General Paper", "Subsidiary"}, subject.Name)

			subjectTotal := 0.0
			paperCount := 0
			for _, result := range subjectRes {
				if result.RawMarks != nil {
					if mark, ok := result.RawMarks["mark"].(float64); ok && mark > 0 {
						subjectTotal += mark
						paperCount++
					} else {
						ca := getFloatValue(result.RawMarks["ca"])
						exam := getFloatValue(result.RawMarks["exam"])
						if ca > 0 || exam > 0 {
							subjectTotal += ca + exam
							paperCount++
						}
					}
				}
			}

			if paperCount > 0 {
				avgSubjectMark := subjectTotal / float64(paperCount)
				totalMarks += avgSubjectMark
				count++

				if isSubsidiary {
					if avgSubjectMark >= 50 {
						totalPoints += 1
					}
				} else {
					totalPoints += calculateALevelPoints(avgSubjectMark)
				}
			}
		}

		if count == 0 {
			continue
		}

		avgMarks := totalMarks / float64(count)
		grade := calculateALevelGrade(avgMarks)

		rankings = append(rankings, StudentRanking{
			StudentID:     student.ID.String(),
			AdmissionNo:   student.AdmissionNo,
			StudentName:   fmt.Sprintf("%s %s %s", student.FirstName, student.MiddleName, student.LastName),
			Gender:        student.Gender,
			TotalPoints:   &totalPoints,
			AverageMarks:  avgMarks,
			SubjectsCount: count,
			Grade:         grade,
		})
	}

	sort.Slice(rankings, func(i, j int) bool {
		if *rankings[i].TotalPoints == *rankings[j].TotalPoints {
			return rankings[i].AverageMarks > rankings[j].AverageMarks
		}
		return *rankings[i].TotalPoints > *rankings[j].TotalPoints
	})

	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	return rankings, nil
}

// Helper functions

func determineLevelCategory(level string) string {
	nurseryLevels := []string{"Baby", "Middle", "Top"}
	primaryLevels := []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7"}
	ordinaryLevels := []string{"S1", "S2", "S3", "S4"}
	advancedLevels := []string{"S5", "S6"}

	for _, l := range nurseryLevels {
		if l == level {
			return "nursery"
		}
	}
	for _, l := range primaryLevels {
		if l == level {
			return "primary"
		}
	}
	for _, l := range ordinaryLevels {
		if l == level {
			return "ordinary"
		}
	}
	for _, l := range advancedLevels {
		if l == level {
			return "advanced"
		}
	}
	return "unknown"
}

func getFloatValue(val interface{}) float64 {
	if val == nil {
		return 0
	}
	switch v := val.(type) {
	case float64:
		return v
	case int:
		return float64(v)
	case int64:
		return float64(v)
	default:
		return 0
	}
}

func gradeToAggregate(grade string, percentage float64) int {
	switch grade {
	case "D1":
		return 1
	case "D2":
		return 2
	case "C3":
		return 3
	case "C4":
		return 4
	case "C5":
		return 5
	case "C6":
		return 6
	case "P7":
		return 7
	case "P8":
		return 8
	case "F9":
		return 9
	default:
		// Fallback calculation
		if percentage >= 90 {
			return 1
		} else if percentage >= 80 {
			return 2
		} else if percentage >= 70 {
			return 3
		} else if percentage >= 60 {
			return 4
		} else if percentage >= 55 {
			return 5
		} else if percentage >= 50 {
			return 6
		} else if percentage >= 45 {
			return 7
		} else if percentage >= 40 {
			return 8
		}
		return 9
	}
}

func calculateDivision(aggregate int) string {
	if aggregate >= 4 && aggregate <= 12 {
		return "I"
	} else if aggregate >= 13 && aggregate <= 23 {
		return "II"
	} else if aggregate >= 24 && aggregate <= 29 {
		return "III"
	} else if aggregate >= 30 {
		return "IV"
	}
	return "U"
}

func calculateOrdinaryGrade(avgMarks float64) string {
	if avgMarks >= 80 {
		return "A"
	} else if avgMarks >= 65 {
		return "B"
	} else if avgMarks >= 50 {
		return "C"
	} else if avgMarks >= 35 {
		return "D"
	}
	return "E"
}

func calculateALevelPoints(avgMark float64) int {
	if avgMark >= 85 {
		return 6
	} else if avgMark >= 80 {
		return 5
	} else if avgMark >= 75 {
		return 4
	} else if avgMark >= 70 {
		return 3
	} else if avgMark >= 65 {
		return 2
	} else if avgMark >= 60 {
		return 1
	}
	return 0
}

func calculateALevelGrade(avgMarks float64) string {
	if avgMarks >= 85 {
		return "D1"
	} else if avgMarks >= 80 {
		return "D2"
	} else if avgMarks >= 75 {
		return "C3"
	} else if avgMarks >= 70 {
		return "C4"
	} else if avgMarks >= 65 {
		return "C5"
	} else if avgMarks >= 60 {
		return "C6"
	} else if avgMarks >= 50 {
		return "P7"
	} else if avgMarks >= 40 {
		return "P8"
	}
	return "F9"
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func columnLetter(col int) string {
	name, _ := excelize.ColumnNumberToName(col)
	return name
}

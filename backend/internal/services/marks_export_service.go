package services

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"github.com/xuri/excelize/v2"
)

type MarksExportService struct {
	repo repositories.MarksExportRepository
}

func NewMarksExportService(repo repositories.MarksExportRepository) *MarksExportService {
	return &MarksExportService{repo: repo}
}

type ExportData struct {
	Class       *models.Class
	Term        string
	Year        string
	Enrollments []models.Enrollment
	Subjects    []models.StandardSubject
	ResultsMap  map[string]map[string]models.SubjectResult
}

// PrepareExportData fetches and organizes all data needed for export
func (s *MarksExportService) PrepareExportData(classID, schoolID, term, year string) (*ExportData, error) {
	class, err := s.repo.FindClassByID(classID, schoolID)
	if err != nil {
		return nil, fmt.Errorf("class not found")
	}

	enrollments, err := s.repo.FindEnrollmentsByClassID(classID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch students")
	}

	if len(enrollments) == 0 {
		return nil, fmt.Errorf("no students found in this class")
	}

	// Sort enrollments by student name
	sort.Slice(enrollments, func(i, j int) bool {
		if enrollments[i].Student.FirstName != enrollments[j].Student.FirstName {
			return enrollments[i].Student.FirstName < enrollments[j].Student.FirstName
		}
		return enrollments[i].Student.LastName < enrollments[j].Student.LastName
	})

	subjects, err := s.repo.FindSubjectsByLevel(class.Level)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch subjects")
	}

	studentIDs := make([]uuid.UUID, len(enrollments))
	for i, e := range enrollments {
		studentIDs[i] = e.StudentID
	}

	results, err := s.repo.FindResultsByStudentsAndTerm(studentIDs, term, year)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch results")
	}

	// Create results map for quick lookup
	resultsMap := make(map[string]map[string]models.SubjectResult)
	for _, r := range results {
		if resultsMap[r.StudentID.String()] == nil {
			resultsMap[r.StudentID.String()] = make(map[string]models.SubjectResult)
		}
		resultsMap[r.StudentID.String()][r.SubjectID.String()] = r
	}

	return &ExportData{
		Class:       class,
		Term:        term,
		Year:        year,
		Enrollments: enrollments,
		Subjects:    subjects,
		ResultsMap:  resultsMap,
	}, nil
}

// GenerateExcelFile creates the Excel file based on level
func (s *MarksExportService) GenerateExcelFile(data *ExportData) (*excelize.File, string, error) {
	if data.Class.Level == "S5" || data.Class.Level == "S6" {
		return s.generateALevelExcel(data)
	}
	return s.generateStandardExcel(data)
}

// generateALevelExcel creates Excel for A-Level (S5-S6) with paper-based format
func (s *MarksExportService) generateALevelExcel(data *ExportData) (*excelize.File, string, error) {
	f := excelize.NewFile()
	sheetName := "Marks"
	f.SetSheetName("Sheet1", sheetName)

	// Title
	f.SetCellValue(sheetName, "A1", fmt.Sprintf("%s - %s Term %s Marks (A-Level)", data.Class.Name, data.Term, data.Year))
	f.MergeCell(sheetName, "A1", "F1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheetName, "A1", "F1", titleStyle)
	f.SetRowHeight(sheetName, 1, 25)

	// Build headers
	headers := []string{"No.", "Student Name", "Reg Number"}
	for _, subject := range data.Subjects {
		maxPapers := subject.Papers
		if maxPapers == 0 {
			maxPapers = 1
		}
		for p := 1; p <= maxPapers; p++ {
			headers = append(headers, fmt.Sprintf("%s P%d CA", subject.Name, p))
			headers = append(headers, fmt.Sprintf("%s P%d Exam", subject.Name, p))
			headers = append(headers, fmt.Sprintf("%s P%d Total", subject.Name, p))
		}
		headers = append(headers, subject.Name+" Grade")
	}
	headers = append(headers, "Total Points")

	// Header style
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
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

	// Data style
	dataStyle, _ := f.NewStyle(&excelize.Style{
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
		Alignment: &excelize.Alignment{Vertical: "center"},
	})

	// Fill data
	row := 4
	for idx, enrollment := range data.Enrollments {
		student := enrollment.Student
		col := 1

		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), idx+1)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), student.FirstName+" "+student.MiddleName+" "+student.LastName)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), student.AdmissionNo)
		col++

		totalPoints := 0
		for _, subject := range data.Subjects {
			maxPapers := subject.Papers
			if maxPapers == 0 {
				maxPapers = 1
			}

			if result, ok := data.ResultsMap[student.ID.String()][subject.ID.String()]; ok {
				hasData := false
				// Check for exam type structure (BOT/MOT/EOT)
				for _, examType := range []string{"BOT", "MOT", "EOT"} {
					if examData, ok := result.RawMarks[examType].(map[string]interface{}); ok {
						for p := 1; p <= maxPapers; p++ {
							paperKey := fmt.Sprintf("paper%d", p)
							if paperData, ok := examData[paperKey].(map[string]interface{}); ok {
								ca := getFloat(paperData["ca"])
								exam := getFloat(paperData["exam"])
								paperTotal := ca + exam
								f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), ca)
								col++
								f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), exam)
								col++
								if paperTotal > 0 {
									f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), paperTotal)
								}
								col++
								hasData = true
							} else {
								col += 3
							}
						}
						break
					}
				}
				// Fallback: direct paper structure
				if !hasData {
					for p := 1; p <= maxPapers; p++ {
						paperKey := fmt.Sprintf("paper%d", p)
						if paperData, ok := result.RawMarks[paperKey].(map[string]interface{}); ok {
							ca := getFloat(paperData["ca"])
							exam := getFloat(paperData["exam"])
							paperTotal := ca + exam
							f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), ca)
							col++
							f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), exam)
							col++
							if paperTotal > 0 {
								f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), paperTotal)
							}
							col++
						} else {
							col += 3
						}
					}
				}
				if result.FinalGrade != "" && result.FinalGrade != "P" {
					f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), result.FinalGrade)
					totalPoints += gradeToPoints(result.FinalGrade)
				}
			} else {
				col += maxPapers * 3
			}
			col++
		}

		if totalPoints > 0 {
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), totalPoints)
		}

		startCell, _ := excelize.CoordinatesToCellName(1, row)
		endCell, _ := excelize.CoordinatesToCellName(col, row)
		f.SetCellStyle(sheetName, startCell, endCell, dataStyle)
		row++
	}

	// Set column widths
	for i := 1; i <= len(headers); i++ {
		colName, _ := excelize.ColumnNumberToName(i)
		f.SetColWidth(sheetName, colName, colName, 12)
	}
	f.SetColWidth(sheetName, "B", "B", 25)

	className := strings.ReplaceAll(strings.ReplaceAll(data.Class.Name, " ", "_"), "/", "_")
	filename := fmt.Sprintf("%s_%s_%s.xlsx", className, data.Term, data.Year)
	return f, filename, nil
}

// generateStandardExcel creates Excel for Nursery/Primary/O-Level with CA/Exam format
func (s *MarksExportService) generateStandardExcel(data *ExportData) (*excelize.File, string, error) {
	f := excelize.NewFile()
	sheetName := "Marks"
	f.SetSheetName("Sheet1", sheetName)

	// Check if nursery level
	isNursery := data.Class.Level == "Baby" || data.Class.Level == "Middle" || data.Class.Level == "Top"

	f.SetCellValue(sheetName, "A1", fmt.Sprintf("%s - %s Term %s Marks", data.Class.Name, data.Term, data.Year))
	f.MergeCell(sheetName, "A1", "F1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheetName, "A1", "F1", titleStyle)
	f.SetRowHeight(sheetName, 1, 25)

	// Build headers
	headers := []string{"No.", "Student Name", "Reg Number", "Gender", "Date of Birth"}
	if isNursery {
		// Nursery: CA, Exam, Average (not Total)
		for _, subject := range data.Subjects {
			headers = append(headers, subject.Name+" CA", subject.Name+" Exam", subject.Name+" Avg", subject.Name+" Grade")
		}
		headers = append(headers, "Total Marks", "Average")
	} else {
		// Primary/O-Level: CA, Exam, Total
		for _, subject := range data.Subjects {
			headers = append(headers, subject.Name+" CA", subject.Name+" Exam", subject.Name+" Total", subject.Name+" Grade")
		}
		headers = append(headers, "Grand Total", "Average")
	}

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
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

	row := 4
	for idx, enrollment := range data.Enrollments {
		student := enrollment.Student

		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), idx+1)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), student.FirstName+" "+(student.MiddleName)+" "+student.LastName)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), student.AdmissionNo)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), student.Gender)
		if student.DateOfBirth != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), student.DateOfBirth.Format("2006-01-02"))
		}

		col := 6
		totalMarks := 0.0
		subjectCount := 0
		for _, subject := range data.Subjects {
			if result, ok := data.ResultsMap[student.ID.String()][subject.ID.String()]; ok {
				var ca, exam, total float64
				// Check for exam type structure (BOT/MOT/EOT)
				for _, examType := range []string{"BOT", "MOT", "EOT"} {
					if examData, ok := result.RawMarks[examType].(map[string]interface{}); ok {
						ca = getFloat(examData["ca"])
						exam = getFloat(examData["exam"])
						total = ca + exam
						break
					}
				}
				// Fallback to direct ca/exam
				if total == 0 {
					ca = getFloat(result.RawMarks["ca"])
					exam = getFloat(result.RawMarks["exam"])
					total = ca + exam
				}
				if ca > 0 || exam > 0 {
					caCell, _ := excelize.CoordinatesToCellName(col, row)
					f.SetCellValue(sheetName, caCell, ca)
					col++
					examCell, _ := excelize.CoordinatesToCellName(col, row)
					f.SetCellValue(sheetName, examCell, exam)
					col++

					if isNursery {
						// Nursery: Show average instead of total
						avg := (ca + exam) / 2.0
						avgCell, _ := excelize.CoordinatesToCellName(col, row)
						f.SetCellValue(sheetName, avgCell, avg)
						col++
						// Grade based on average
						subjectGrade := calculateSubjectGrade(avg, data.Class.Level)
						gradeCell, _ := excelize.CoordinatesToCellName(col, row)
						f.SetCellValue(sheetName, gradeCell, subjectGrade)
						col++
						totalMarks += total
					} else {
						// Primary/O-Level: Show total
						totalCell, _ := excelize.CoordinatesToCellName(col, row)
						f.SetCellValue(sheetName, totalCell, total)
						col++
						// Grade based on total
						subjectGrade := calculateSubjectGrade(total, data.Class.Level)
						gradeCell, _ := excelize.CoordinatesToCellName(col, row)
						f.SetCellValue(sheetName, gradeCell, subjectGrade)
						col++
						totalMarks += total
					}
					subjectCount++
				} else {
					col += 4
				}
			} else {
				col += 4
			}
		}

		grandTotalCell, _ := excelize.CoordinatesToCellName(col, row)
		f.SetCellValue(sheetName, grandTotalCell, totalMarks)
		col++

		avgCell, _ := excelize.CoordinatesToCellName(col, row)
		if subjectCount > 0 {
			if isNursery {
				// Nursery: Average of all subject averages
				f.SetCellValue(sheetName, avgCell, totalMarks/(float64(subjectCount)*2.0))
			} else {
				// Primary/O-Level: Average of totals
				f.SetCellValue(sheetName, avgCell, totalMarks/float64(subjectCount))
			}
		}
		col++

		startCell, _ := excelize.CoordinatesToCellName(1, row)
		endCell, _ := excelize.CoordinatesToCellName(col, row)
		f.SetCellStyle(sheetName, startCell, endCell, dataStyle)

		row++
	}

	// Set column widths
	for i := 1; i <= len(headers); i++ {
		colName, _ := excelize.ColumnNumberToName(i)
		f.SetColWidth(sheetName, colName, colName, 15)
	}
	f.SetColWidth(sheetName, "B", "B", 25)

	className := strings.ReplaceAll(strings.ReplaceAll(data.Class.Name, " ", "_"), "/", "_")
	filename := fmt.Sprintf("%s_%s_%s.xlsx", className, data.Term, data.Year)
	return f, filename, nil
}

// Helper functions

func columnName(col int) string {
	name, _ := excelize.ColumnNumberToName(col)
	return name
}

func getFloat(val interface{}) float64 {
	switch v := val.(type) {
	case float64:
		return v
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case string:
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return 0
}

func gradeToPoints(grade string) int {
	switch grade {
	case "D1":
		return 6
	case "D2":
		return 5
	case "C3":
		return 4
	case "C4":
		return 3
	case "C5":
		return 2
	case "C6":
		return 1
	case "P7":
		return 1
	case "P8":
		return 1
	default:
		return 0
	}
}

func calculateSubjectGrade(total float64, level string) string {
	switch level {
	case "Baby", "Middle", "Top", "Nursery":
		// Nursery grading
		if total >= 80 {
			return "A"
		} else if total >= 65 {
			return "B"
		} else if total >= 50 {
			return "C"
		} else if total >= 35 {
			return "D"
		}
		return "E"

	case "P1", "P2", "P3", "P4", "P5", "P6", "P7":
		// Primary grading (UNEB)
		if total >= 80 {
			return "D1"
		} else if total >= 70 {
			return "D2"
		} else if total >= 60 {
			return "C3"
		} else if total >= 50 {
			return "C4"
		} else if total >= 40 {
			return "C5"
		} else if total >= 30 {
			return "C6"
		} else if total >= 20 {
			return "P7"
		} else if total >= 10 {
			return "P8"
		}
		return "F9"

	case "S1", "S2", "S3", "S4":
		// O-Level grading (NCDC)
		if total >= 80 {
			return "A"
		} else if total >= 65 {
			return "B"
		} else if total >= 50 {
			return "C"
		} else if total >= 35 {
			return "D"
		}
		return "E"

	case "S5", "S6":
		// A-Level grading (UACE)
		if total >= 85 {
			return "D1"
		} else if total >= 80 {
			return "D2"
		} else if total >= 75 {
			return "C3"
		} else if total >= 70 {
			return "C4"
		} else if total >= 65 {
			return "C5"
		} else if total >= 60 {
			return "C6"
		} else if total >= 50 {
			return "P7"
		} else if total >= 40 {
			return "P8"
		}
		return "F9"

	default:
		return ""
	}
}

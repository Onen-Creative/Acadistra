package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ClassRankingHandler struct {
	db *gorm.DB
}

func NewClassRankingHandler(db *gorm.DB) *ClassRankingHandler {
	return &ClassRankingHandler{db: db}
}

type StudentRanking struct {
	StudentID      string  `json:"student_id"`
	AdmissionNo    string  `json:"admission_no"`
	StudentName    string  `json:"student_name"`
	Gender         string  `json:"gender"`
	Aggregate      *int    `json:"aggregate,omitempty"`      // For Primary
	AverageMarks   float64 `json:"average_marks"`            // For all levels
	TotalPoints    *int    `json:"total_points,omitempty"`   // For A-Level
	SubjectsCount  int     `json:"subjects_count"`
	Rank           int     `json:"rank"`
	Division       string  `json:"division,omitempty"`       // For Primary
	Grade          string  `json:"grade,omitempty"`          // For O-Level/A-Level
}

type ClassRankingResponse struct {
	ClassID      string           `json:"class_id"`
	ClassName    string           `json:"class_name"`
	Level        string           `json:"level"`
	Term         string           `json:"term"`
	Year         string           `json:"year"`
	ExamType     string           `json:"exam_type"`
	TotalStudents int             `json:"total_students"`
	Rankings     []StudentRanking `json:"rankings"`
}

// GetClassRanking returns ranked students for a specific class
func (h *ClassRankingHandler) GetClassRanking(c *gin.Context) {
	classID := c.Param("class_id")
	term := c.Query("term")
	year := c.Query("year")
	examType := c.DefaultQuery("exam_type", "EOT")

	if term == "" || year == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "term and year are required"})
		return
	}

	// Get class details
	var class models.Class
	if err := h.db.Where("id = ?", classID).First(&class).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	// Get students in the class through enrollments
	var students []models.Student
	if err := h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND enrollments.status = ?", classID, "active").
		Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	if len(students) == 0 {
		c.JSON(http.StatusOK, ClassRankingResponse{
			ClassID:       classID,
			ClassName:     class.Name,
			Level:         class.Level,
			Term:          term,
			Year:          year,
			ExamType:      examType,
			TotalStudents: 0,
			Rankings:      []StudentRanking{},
		})
		return
	}

	// Determine level category
	levelCategory := determineLevelCategory(class.Level)

	// Get rankings based on level
	var rankings []StudentRanking
	var err error

	switch levelCategory {
	case "nursery":
		rankings, err = h.getNurseryRankings(students, term, year, examType)
	case "primary":
		rankings, err = h.getPrimaryRankings(students, term, year, examType)
	case "ordinary":
		rankings, err = h.getOrdinaryRankings(students, term, year, examType)
	case "advanced":
		rankings, err = h.getAdvancedRankings(students, term, year, examType)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown level category"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := ClassRankingResponse{
		ClassID:       classID,
		ClassName:     class.Name,
		Level:         class.Level,
		Term:          term,
		Year:          year,
		ExamType:      examType,
		TotalStudents: len(rankings),
		Rankings:      rankings,
	}

	c.JSON(http.StatusOK, response)
}

// ExportClassRanking exports class rankings to Excel
func (h *ClassRankingHandler) ExportClassRanking(c *gin.Context) {
	classID := c.Param("class_id")
	term := c.Query("term")
	year := c.Query("year")
	examType := c.DefaultQuery("exam_type", "EOT")

	if term == "" || year == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "term and year are required"})
		return
	}

	// Get class details
	var class models.Class
	if err := h.db.Preload("School").Where("id = ?", classID).First(&class).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	// Get students in the class through enrollments
	var students []models.Student
	if err := h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND enrollments.status = ?", classID, "active").
		Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	// Determine level category
	levelCategory := determineLevelCategory(class.Level)

	// Get rankings based on level
	var rankings []StudentRanking
	var err error

	switch levelCategory {
	case "nursery":
		rankings, err = h.getNurseryRankings(students, term, year, examType)
	case "primary":
		rankings, err = h.getPrimaryRankings(students, term, year, examType)
	case "ordinary":
		rankings, err = h.getOrdinaryRankings(students, term, year, examType)
	case "advanced":
		rankings, err = h.getAdvancedRankings(students, term, year, examType)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown level category"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create Excel file
	f := excelize.NewFile()
	sheetName := "Class Rankings"
	f.SetSheetName("Sheet1", sheetName)

	// Set header style
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 12},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
		},
	})

	// Title
	f.SetCellValue(sheetName, "A1", class.School.Name)
	f.MergeCell(sheetName, "A1", "H1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 16},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheetName, "A1", "H1", titleStyle)

	// Subtitle
	f.SetCellValue(sheetName, "A2", fmt.Sprintf("Class Rankings - %s", class.Name))
	f.MergeCell(sheetName, "A2", "H2")
	subtitleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheetName, "A2", "H2", subtitleStyle)

	// Info
	f.SetCellValue(sheetName, "A3", fmt.Sprintf("Term: %s | Year: %s | Exam: %s", term, year, examType))
	f.MergeCell(sheetName, "A3", "H3")
	infoStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheetName, "A3", "H3", infoStyle)

	// Headers
	row := 5
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

	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, row)
		f.SetCellValue(sheetName, cell, header)
		f.SetCellStyle(sheetName, cell, cell, headerStyle)
	}

	// Data
	row++
	for _, ranking := range rankings {
		col := 1
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), ranking.Rank)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), ranking.AdmissionNo)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), ranking.StudentName)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), ranking.Gender)
		col++

		switch levelCategory {
		case "nursery":
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), fmt.Sprintf("%.1f", ranking.AverageMarks))
			col++
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), ranking.SubjectsCount)
		case "primary":
			if ranking.Aggregate != nil {
				f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), *ranking.Aggregate)
			}
			col++
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), fmt.Sprintf("%.1f", ranking.AverageMarks))
			col++
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), ranking.Division)
			col++
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), ranking.SubjectsCount)
		case "ordinary":
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), fmt.Sprintf("%.1f", ranking.AverageMarks))
			col++
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), ranking.Grade)
			col++
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), ranking.SubjectsCount)
		case "advanced":
			if ranking.TotalPoints != nil {
				f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), *ranking.TotalPoints)
			}
			col++
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), fmt.Sprintf("%.1f", ranking.AverageMarks))
			col++
			f.SetCellValue(sheetName, fmt.Sprintf("%s%d", string(rune('A'+col-1)), row), ranking.SubjectsCount)
		}

		row++
	}

	// Auto-fit columns
	for i := 1; i <= len(headers); i++ {
		col, _ := excelize.ColumnNumberToName(i)
		f.SetColWidth(sheetName, col, col, 15)
	}

	// Set response headers
	fileName := fmt.Sprintf("Class_Rankings_%s_%s_%s_%s.xlsx", class.Name, term, year, time.Now().Format("20060102"))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))

	// Write to response
	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Excel file"})
		return
	}
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

func (h *ClassRankingHandler) getNurseryRankings(students []models.Student, term, year, examType string) ([]StudentRanking, error) {
	// Get all student IDs
	studentIDs := make([]string, len(students))
	studentMap := make(map[string]models.Student)
	for i, student := range students {
		studentIDs[i] = student.ID.String()
		studentMap[student.ID.String()] = student
	}

	// Fetch all results in one query
	var results []models.SubjectResult
	if err := h.db.Where("student_id IN ? AND term = ? AND year = ? AND exam_type = ?", 
		studentIDs, term, year, examType).Find(&results).Error; err != nil {
		return nil, err
	}

	// Group results by student
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

	// Sort by average marks (descending)
	sort.Slice(rankings, func(i, j int) bool {
		return rankings[i].AverageMarks > rankings[j].AverageMarks
	})

	// Assign ranks
	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	return rankings, nil
}

func (h *ClassRankingHandler) getPrimaryRankings(students []models.Student, term, year, examType string) ([]StudentRanking, error) {
	// Get all student IDs
	studentIDs := make([]string, len(students))
	studentMap := make(map[string]models.Student)
	for i, student := range students {
		studentIDs[i] = student.ID.String()
		studentMap[student.ID.String()] = student
	}

	// Fetch all results in one query
	var results []models.SubjectResult
	if err := h.db.Where("student_id IN ? AND term = ? AND year = ? AND exam_type = ?", 
		studentIDs, term, year, examType).Find(&results).Error; err != nil {
		return nil, err
	}

	// Group results by student
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
				ca := 0.0
				exam := 0.0

				if caVal, ok := result.RawMarks["ca"].(float64); ok {
					ca = caVal
				}
				if examVal, ok := result.RawMarks["exam"].(float64); ok {
					exam = examVal
				}

				if ca > 0 || exam > 0 {
					// Calculate percentage
					percentage := ((ca / 40) * 40) + ((exam / 60) * 60)
					totalMarks += percentage
					
					// Calculate aggregate using final_grade (D1=1, D2=2, C3=3, etc.)
					grade := result.FinalGrade
					var gradePoints int
					switch grade {
					case "D1":
						gradePoints = 1
					case "D2":
						gradePoints = 2
					case "C3":
						gradePoints = 3
					case "C4":
						gradePoints = 4
					case "C5":
						gradePoints = 5
					case "C6":
						gradePoints = 6
					case "P7":
						gradePoints = 7
					case "P8":
						gradePoints = 8
					case "F9":
						gradePoints = 9
					default:
						// Fallback: calculate from percentage if grade is missing
						if percentage >= 90 {
							gradePoints = 1
						} else if percentage >= 80 {
							gradePoints = 2
						} else if percentage >= 70 {
							gradePoints = 3
						} else if percentage >= 60 {
							gradePoints = 4
						} else if percentage >= 55 {
							gradePoints = 5
						} else if percentage >= 50 {
							gradePoints = 6
						} else if percentage >= 45 {
							gradePoints = 7
						} else if percentage >= 40 {
							gradePoints = 8
						} else {
							gradePoints = 9
						}
					}
					aggregate += gradePoints
					count++
				}
			}
		}

		if count == 0 {
			continue
		}

		avgMarks := totalMarks / float64(count)
		
		// Determine division based on total aggregate (not average)
		division := ""
		if aggregate >= 4 && aggregate <= 12 {
			division = "I"
		} else if aggregate >= 13 && aggregate <= 23 {
			division = "II"
		} else if aggregate >= 24 && aggregate <= 29 {
			division = "III"
		} else if aggregate >= 30 {
			division = "IV"
		} else {
			division = "U"
		}

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

	// Sort by aggregate (ascending), then by average marks (descending)
	sort.Slice(rankings, func(i, j int) bool {
		if *rankings[i].Aggregate == *rankings[j].Aggregate {
			return rankings[i].AverageMarks > rankings[j].AverageMarks
		}
		return *rankings[i].Aggregate < *rankings[j].Aggregate
	})

	// Assign ranks
	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	return rankings, nil
}

func (h *ClassRankingHandler) getOrdinaryRankings(students []models.Student, term, year, examType string) ([]StudentRanking, error) {
	// Get all student IDs
	studentIDs := make([]string, len(students))
	studentMap := make(map[string]models.Student)
	for i, student := range students {
		studentIDs[i] = student.ID.String()
		studentMap[student.ID.String()] = student
	}

	// Fetch all results in one query
	var results []models.SubjectResult
	if err := h.db.Where("student_id IN ? AND term = ? AND year = ? AND exam_type = ?", 
		studentIDs, term, year, examType).Find(&results).Error; err != nil {
		return nil, err
	}

	// Group results by student
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
				ca := 0.0
				exam := 0.0

				if caVal, ok := result.RawMarks["ca"].(float64); ok {
					ca = caVal
				}
				if examVal, ok := result.RawMarks["exam"].(float64); ok {
					exam = examVal
				}

				if ca > 0 || exam > 0 {
					// Calculate percentage: (CA/20)*20 + (Exam/80)*80
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
		
		// Determine grade using NCDC grading system (A-E)
		grade := ""
		if avgMarks >= 80 {
			grade = "A"
		} else if avgMarks >= 65 {
			grade = "B"
		} else if avgMarks >= 50 {
			grade = "C"
		} else if avgMarks >= 35 {
			grade = "D"
		} else {
			grade = "E"
		}

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

	// Sort by average marks (descending)
	sort.Slice(rankings, func(i, j int) bool {
		return rankings[i].AverageMarks > rankings[j].AverageMarks
	})

	// Assign ranks
	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	return rankings, nil
}

func (h *ClassRankingHandler) getAdvancedRankings(students []models.Student, term, year, examType string) ([]StudentRanking, error) {
	// Get all student IDs
	studentIDs := make([]string, len(students))
	studentMap := make(map[string]models.Student)
	for i, student := range students {
		studentIDs[i] = student.ID.String()
		studentMap[student.ID.String()] = student
	}

	// Fetch all results in one query (no preload needed, we'll fetch subjects separately)
	var results []models.SubjectResult
	if err := h.db.Where("student_id IN ? AND term = ? AND year = ? AND exam_type = ?", 
		studentIDs, term, year, examType).Find(&results).Error; err != nil {
		return nil, err
	}

	// Group results by student
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

		// Group results by subject_id
		subjectResults := make(map[string][]models.SubjectResult)
		for _, result := range results {
			subjectID := result.SubjectID.String()
			subjectResults[subjectID] = append(subjectResults[subjectID], result)
		}

		for _, subjectRes := range subjectResults {
			if len(subjectRes) == 0 {
				continue
			}

			// Get subject details from database
			var subject models.StandardSubject
			if err := h.db.Where("id = ?", subjectRes[0].SubjectID).First(&subject).Error; err != nil {
				continue
			}

			// Check if subsidiary subject
			isSubsidiary := contains([]string{"ICT", "General Paper", "Subsidiary"}, subject.Name)

			// Calculate total marks for this subject
			subjectTotal := 0.0
			paperCount := 0
			for _, result := range subjectRes {
				if result.RawMarks != nil {
					if mark, ok := result.RawMarks["mark"].(float64); ok && mark > 0 {
						subjectTotal += mark
						paperCount++
					} else {
						// Try ca + exam
						ca := 0.0
						exam := 0.0
						if caVal, ok := result.RawMarks["ca"].(float64); ok {
							ca = caVal
						}
						if examVal, ok := result.RawMarks["exam"].(float64); ok {
							exam = examVal
						}
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

				// Calculate points
				if isSubsidiary {
					if avgSubjectMark >= 50 {
						totalPoints += 1
					}
				} else {
					// Main subjects: D1=6, D2=5, C3=4, C4=3, C5=2, C6=1, P7=1, P8=1, F9=0
					if avgSubjectMark >= 85 {
						totalPoints += 6
					} else if avgSubjectMark >= 80 {
						totalPoints += 5
					} else if avgSubjectMark >= 75 {
						totalPoints += 4
					} else if avgSubjectMark >= 70 {
						totalPoints += 3
					} else if avgSubjectMark >= 65 {
						totalPoints += 2
					} else if avgSubjectMark >= 60 {
						totalPoints += 1
					}
				}
			}
		}

		if count == 0 {
			continue
		}

		avgMarks := totalMarks / float64(count)
		
		// Determine grade based on average marks using UACE grading
		grade := ""
		if avgMarks >= 85 {
			grade = "D1"
		} else if avgMarks >= 80 {
			grade = "D2"
		} else if avgMarks >= 75 {
			grade = "C3"
		} else if avgMarks >= 70 {
			grade = "C4"
		} else if avgMarks >= 65 {
			grade = "C5"
		} else if avgMarks >= 60 {
			grade = "C6"
		} else if avgMarks >= 50 {
			grade = "P7"
		} else if avgMarks >= 40 {
			grade = "P8"
		} else {
			grade = "F9"
		}

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

	// Sort by total points (descending), then by average marks (descending)
	sort.Slice(rankings, func(i, j int) bool {
		if *rankings[i].TotalPoints == *rankings[j].TotalPoints {
			return rankings[i].AverageMarks > rankings[j].AverageMarks
		}
		return *rankings[i].TotalPoints > *rankings[j].TotalPoints
	})

	// Assign ranks
	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	return rankings, nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// GetAvailableTermsYears returns available terms and years for a class
func (h *ClassRankingHandler) GetAvailableTermsYears(c *gin.Context) {
	classID := c.Param("class_id")

	type TermYear struct {
		Term string `json:"term"`
		Year int    `json:"year"`
	}

	var termYears []TermYear
	if err := h.db.Model(&models.SubjectResult{}).
		Select("DISTINCT subject_results.term, subject_results.year").
		Where("subject_results.class_id = ?", classID).
		Order("subject_results.year DESC, subject_results.term DESC").
		Scan(&termYears).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch terms and years"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": termYears})
}

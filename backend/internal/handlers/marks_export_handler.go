package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type MarksExportHandler struct {
	db *gorm.DB
}

func NewMarksExportHandler(db *gorm.DB) *MarksExportHandler {
	return &MarksExportHandler{db: db}
}

// ExportClassMarks exports all students' marks for a specific class
func (h *MarksExportHandler) ExportClassMarks(c *gin.Context) {
	classID := c.Query("class_id")
	term := c.Query("term")
	year := c.Query("year")
	schoolID := c.GetString("tenant_school_id")

	if classID == "" || term == "" || year == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id, term, and year are required"})
		return
	}

	// Get class details
	var class models.Class
	if err := h.db.Where("id = ? AND school_id = ?", classID, schoolID).First(&class).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	// Get all students in the class
	var enrollments []models.Enrollment
	if err := h.db.Preload("Student").Where("class_id = ?", classID).Find(&enrollments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	if len(enrollments) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No students found in this class"})
		return
	}

	// Get all subjects for this level
	var subjects []models.StandardSubject
	if err := h.db.Where("level = ?", class.Level).Order("name").Find(&subjects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subjects"})
		return
	}

	// Get all results for these students
	studentIDs := make([]uuid.UUID, len(enrollments))
	for i, e := range enrollments {
		studentIDs[i] = e.StudentID
	}

	var results []models.SubjectResult
	if err := h.db.Where("student_id IN ? AND term = ? AND year = ?", studentIDs, term, year).Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch results"})
		return
	}

	// Debug: Log results count
	fmt.Printf("Found %d results for class %s, term %s, year %s\n", len(results), class.Name, term, year)
	if len(results) > 0 {
		fmt.Printf("Sample result raw_marks: %+v\n", results[0].RawMarks)
	}

	// Create results map for quick lookup
	resultsMap := make(map[string]map[string]models.SubjectResult)
	for _, r := range results {
		if resultsMap[r.StudentID.String()] == nil {
			resultsMap[r.StudentID.String()] = make(map[string]models.SubjectResult)
		}
		resultsMap[r.StudentID.String()][r.SubjectID.String()] = r
	}

	// Create Excel file based on level
	if class.Level == "S5" || class.Level == "S6" {
		h.exportALevelMarks(c, class, term, year, enrollments, subjects, resultsMap)
	} else {
		h.exportStandardMarks(c, class, term, year, enrollments, subjects, resultsMap)
	}
}

// exportALevelMarks exports marks for A-Level (S5-S6) with paper-based format
func (h *MarksExportHandler) exportALevelMarks(c *gin.Context, class models.Class, term, year string, enrollments []models.Enrollment, subjects []models.StandardSubject, resultsMap map[string]map[string]models.SubjectResult) {
	f := excelize.NewFile()
	sheetName := "Marks"
	f.SetSheetName("Sheet1", sheetName)

	// Title
	f.SetCellValue(sheetName, "A1", fmt.Sprintf("%s - %s Term %s Marks (A-Level)", class.Name, term, year))
	f.MergeCell(sheetName, "A1", "F1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheetName, "A1", "F1", titleStyle)
	f.SetRowHeight(sheetName, 1, 25)

	// Headers
	headers := []string{"No.", "Student Name", "Reg Number"}
	for _, subject := range subjects {
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

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
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
	for idx, enrollment := range enrollments {
		student := enrollment.Student
		col := 1
		
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), idx+1)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), student.FirstName+" "+student.MiddleName+" "+student.LastName)
		col++
		f.SetCellValue(sheetName, fmt.Sprintf("%s%d", columnName(col), row), student.AdmissionNo)
		col++

		totalPoints := 0
		for _, subject := range subjects {
			maxPapers := subject.Papers
			if maxPapers == 0 {
				maxPapers = 1
			}
			
			if result, ok := resultsMap[student.ID.String()][subject.ID.String()]; ok {
				// Check for exam type structure or direct paper structure
				hasData := false
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

	for i := 1; i <= len(headers); i++ {
		colName, _ := excelize.ColumnNumberToName(i)
		f.SetColWidth(sheetName, colName, colName, 12)
	}
	f.SetColWidth(sheetName, "B", "B", 25)

	className := strings.ReplaceAll(strings.ReplaceAll(class.Name, " ", "_"), "/", "_")
	filename := fmt.Sprintf("%s_%s_%s.xlsx", className, term, year)
	c.Writer.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Writer.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Writer.WriteHeader(http.StatusOK)
	f.Write(c.Writer)
}

// exportStandardMarks exports marks for Nursery/Primary/O-Level with CA/Exam format
func (h *MarksExportHandler) exportStandardMarks(c *gin.Context, class models.Class, term, year string, enrollments []models.Enrollment, subjects []models.StandardSubject, resultsMap map[string]map[string]models.SubjectResult) {
	f := excelize.NewFile()
	sheetName := "Marks"
	f.SetSheetName("Sheet1", sheetName)

	// Check if nursery level
	isNursery := class.Level == "Baby" || class.Level == "Middle" || class.Level == "Top"

	f.SetCellValue(sheetName, "A1", fmt.Sprintf("%s - %s Term %s Marks", class.Name, term, year))
	f.MergeCell(sheetName, "A1", "F1")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetCellStyle(sheetName, "A1", "F1", titleStyle)
	f.SetRowHeight(sheetName, 1, 25)

	headers := []string{"No.", "Student Name", "Reg Number", "Gender", "Date of Birth"}
	if isNursery {
		// Nursery: CA, Exam, Average (not Total)
		for _, subject := range subjects {
			headers = append(headers, subject.Name+" CA", subject.Name+" Exam", subject.Name+" Avg", subject.Name+" Grade")
		}
		headers = append(headers, "Total Marks", "Average")
	} else {
		// Primary/O-Level: CA, Exam, Total
		for _, subject := range subjects {
			headers = append(headers, subject.Name+" CA", subject.Name+" Exam", subject.Name+" Total", subject.Name+" Grade")
		}
		headers = append(headers, "Grand Total", "Average")
	}

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
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
	for idx, enrollment := range enrollments {
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
		for _, subject := range subjects {
			if result, ok := resultsMap[student.ID.String()][subject.ID.String()]; ok {
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
						subjectGrade := calculateSubjectGrade(avg, class.Level)
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
						subjectGrade := calculateSubjectGrade(total, class.Level)
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

	for i := 1; i <= len(headers); i++ {
		colName, _ := excelize.ColumnNumberToName(i)
		f.SetColWidth(sheetName, colName, colName, 15)
	}
	f.SetColWidth(sheetName, "B", "B", 25)

	className := strings.ReplaceAll(strings.ReplaceAll(class.Name, " ", "_"), "/", "_")
	filename := fmt.Sprintf("%s_%s_%s.xlsx", className, term, year)
	c.Writer.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Writer.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Writer.WriteHeader(http.StatusOK)
	f.Write(c.Writer)
}

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
		// Try parsing string to float
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return 0
}

func gradeToPoints(grade string) int {
	switch grade {
	case "A":
		return 6
	case "B":
		return 5
	case "C":
		return 4
	case "D":
		return 3
	case "E":
		return 2
	case "O":
		return 1
	default:
		return 0
	}
}

func calculateSubjectGrade(total float64, level string) string {
	// Calculate percentage based on level-specific weighting
	var percentage float64
	
	switch level {
	case "Baby", "Middle", "Top", "Nursery":
		// Nursery: CA/20 (40%) + Exam/80 (60%) = 100%
		percentage = total // Already calculated as percentage in backend
		if percentage >= 80 {
			return "A"
		} else if percentage >= 65 {
			return "B"
		} else if percentage >= 50 {
			return "C"
		} else if percentage >= 35 {
			return "D"
		}
		return "E"
		
	case "P1", "P2", "P3":
		// Lower Primary: CA/20 (40%) + Exam/80 (60%) = 100%
		percentage = total
		if percentage >= 80 {
			return "D1"
		} else if percentage >= 70 {
			return "D2"
		} else if percentage >= 60 {
			return "C3"
		} else if percentage >= 50 {
			return "C4"
		} else if percentage >= 40 {
			return "C5"
		} else if percentage >= 30 {
			return "C6"
		} else if percentage >= 20 {
			return "P7"
		} else if percentage >= 10 {
			return "P8"
		}
		return "F9"
		
	case "P4", "P5", "P6", "P7":
		// Upper Primary: CA/20 (40%) + Exam/80 (60%) = 100%
		percentage = total
		if percentage >= 80 {
			return "D1"
		} else if percentage >= 70 {
			return "D2"
		} else if percentage >= 60 {
			return "C3"
		} else if percentage >= 50 {
			return "C4"
		} else if percentage >= 40 {
			return "C5"
		} else if percentage >= 30 {
			return "C6"
		} else if percentage >= 20 {
			return "P7"
		} else if percentage >= 10 {
			return "P8"
		}
		return "F9"
		
	case "S1", "S2", "S3", "S4":
		// NCDC: School-Based/20 (20%) + External/80 (80%) = 100%
		percentage = total
		if percentage >= 80 {
			return "A"
		} else if percentage >= 65 {
			return "B"
		} else if percentage >= 50 {
			return "C"
		} else if percentage >= 35 {
			return "D"
		}
		return "E"
		
	default:
		return ""
	}
}

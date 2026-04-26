package handlers

import (
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/grading"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type ResultHandler struct {
	db           *gorm.DB
	emailService *services.EmailService
}

func NewResultHandler(db *gorm.DB, emailService *services.EmailService) *ResultHandler {
	return &ResultHandler{
		db:           db,
		emailService: emailService,
	}
}

func (h *ResultHandler) GetByStudent(c *gin.Context) {
	studentID := c.Param("id")
	term := c.Query("term")
	year := c.Query("year")
	examType := c.Query("exam_type")
	schoolID := c.GetString("tenant_school_id")
	
	// Verify student belongs to the same school
	var student models.Student
	if err := h.db.Where("id = ? AND school_id = ?", studentID, schoolID).First(&student).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Student not found or access denied"})
		return
	}
	
	type ResultWithSubject struct {
		models.SubjectResult
		SubjectName string `json:"subject_name"`
		SubjectCode string `json:"subject_code"`
		Position    string `json:"position"`
	}
	
	var results []ResultWithSubject
	// Join with standard_subjects instead of subjects to ensure consistency
	query := h.db.Table("subject_results").
		Select("subject_results.*, standard_subjects.name as subject_name, standard_subjects.code as subject_code").
		Joins("LEFT JOIN standard_subjects ON subject_results.subject_id = standard_subjects.id").
		Where("subject_results.student_id = ? AND subject_results.school_id = ?", studentID, schoolID)
	
	if term != "" {
		query = query.Where("subject_results.term = ?", term)
	}
	if year != "" {
		query = query.Where("subject_results.year = ?", year)
	}
	if examType != "" {
		query = query.Where("subject_results.exam_type = ?", examType)
	}
	
	if err := query.Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// Get student's class level to check if S1-S4
	var enrollment models.Enrollment
	var classLevel string
	if err := h.db.Where("student_id = ?", studentID).Order("created_at DESC").First(&enrollment).Error; err == nil {
		var class models.Class
		if err := h.db.First(&class, enrollment.ClassID).Error; err == nil {
			classLevel = class.Level
		}
	}
	
	// For S1-S4, fetch AOI marks and update CA in results
	if classLevel == "S1" || classLevel == "S2" || classLevel == "S3" || classLevel == "S4" {
		for i := range results {
			var aoiActivity models.IntegrationActivity
			if err := h.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ?",
				studentID, results[i].SubjectID, results[i].Term, results[i].Year).First(&aoiActivity).Error; err == nil {
				// Calculate AOI out of 20
				if aoiActivity.Marks != nil {
					activities := []float64{}
					for j := 1; j <= 5; j++ {
						key := fmt.Sprintf("activity%d", j)
						if val, ok := aoiActivity.Marks[key].(float64); ok {
							activities = append(activities, val)
						}
					}
					if len(activities) > 0 {
						avg := 0.0
						for _, v := range activities {
							avg += v
						}
						avg = avg / float64(len(activities))
						aoiCA := math.Round((avg / 3.0) * 20.0)
						
						// Update CA in raw_marks
						if results[i].RawMarks == nil {
							results[i].RawMarks = make(models.JSONB)
						}
						results[i].RawMarks["ca"] = aoiCA
						
						// Recalculate total
						exam := 0.0
						if e, ok := results[i].RawMarks["exam"].(float64); ok {
							exam = e
						}
						results[i].RawMarks["total"] = aoiCA + exam
					}
				}
			}
		}
	}
	
	// Fix grades for subsidiary subjects only (S5/S6 Advanced Level)
	for i := range results {
		// Only apply subsidiary grading for S5/S6 levels
		if classLevel == "S5" || classLevel == "S6" {
			// Check if this is a subsidiary subject
			isSubsidiary := results[i].SubjectName == "ICT" || results[i].SubjectName == "General Paper" ||
				strings.Contains(strings.ToLower(results[i].SubjectName), "ict") ||
				strings.Contains(strings.ToLower(results[i].SubjectName), "general paper") ||
				strings.Contains(strings.ToLower(results[i].SubjectName), "subsidiary")
			
			if isSubsidiary {
				// Recalculate grade for subsidiary subjects - O or F only
				if results[i].RawMarks != nil {
					mark := 0.0
					// Try different fields for the mark
					if m, ok := results[i].RawMarks["mark"].(float64); ok {
						mark = m
					} else if t, ok := results[i].RawMarks["total"].(float64); ok {
						mark = t
					} else {
						// Fallback to ca + exam
						ca := 0.0
						exam := 0.0
						if c, ok := results[i].RawMarks["ca"].(float64); ok {
							ca = c
						}
						if e, ok := results[i].RawMarks["exam"].(float64); ok {
							exam = e
						}
						mark = ca + exam
					}
					
					if mark >= 50 {
						results[i].FinalGrade = "O"
					} else if mark > 0 {
						results[i].FinalGrade = "F"
					}
				}
			}
		}
	}
	
	// Calculate position if we have results
	position := "N/A"
	if len(results) > 0 && term != "" && year != "" && examType != "" {
		// Get student's class
		var enrollment models.Enrollment
		if err := h.db.Where("student_id = ?", studentID).Order("created_at DESC").First(&enrollment).Error; err == nil {
			// Calculate total marks for all students in the class
			type StudentTotal struct {
				StudentID string
				Total     float64
			}
			
			var studentTotals []StudentTotal
			h.db.Raw(`
				SELECT 
					sr.student_id,
					SUM(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) as total
				FROM subject_results sr
				JOIN enrollments e ON sr.student_id = e.student_id
				WHERE e.class_id = ?
					AND sr.term = ?
					AND sr.year = ?
					AND sr.exam_type = ?
					AND sr.school_id = ?
				GROUP BY sr.student_id
				ORDER BY total DESC
			`, enrollment.ClassID, term, year, examType, schoolID).Scan(&studentTotals)
			
			if len(studentTotals) > 0 {
				for i, st := range studentTotals {
					if st.StudentID == studentID {
						position = fmt.Sprintf("%d out of %d", i+1, len(studentTotals))
						break
					}
				}
			}
		}
	}
	
	// Add position to all results
	for i := range results {
		results[i].Position = position
	}
	
	// Get outstanding fees balance for the student, term, and year
	var outstandingFees float64
	if term != "" && year != "" {
		var studentFees models.StudentFees
		// Use silent query to avoid logging "record not found"
		err := h.db.Session(&gorm.Session{Logger: h.db.Logger.LogMode(1)}).Where("student_id = ? AND term = ? AND year = ?", studentID, term, year).First(&studentFees).Error
		if err == nil {
			outstandingFees = studentFees.Outstanding
		}
	}
	
	c.JSON(http.StatusOK, gin.H{"results": results, "outstanding_fees": outstandingFees})
}

func (h *ResultHandler) CreateOrUpdate(c *gin.Context) {
	var req struct {
		StudentID   string                 `json:"student_id" binding:"required"`
		SubjectID   string                 `json:"subject_id" binding:"required"`
		ClassID     string                 `json:"class_id"`
		Term        string                 `json:"term" binding:"required"`
		Year        int                    `json:"year" binding:"required"`
		ExamType    string                 `json:"exam_type"`
		FinalGrade  string                 `json:"final_grade"`
		RawMarks    models.JSONB           `json:"raw_marks"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}
	
	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subject ID"})
		return
	}
	
	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}
	
	// Verify student belongs to the same school
	var student models.Student
	if err := h.db.Where("id = ? AND school_id = ?", studentID, schoolID).First(&student).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Student not found or access denied"})
		return
	}
	
	// Get student's class from enrollment
	var enrollment models.Enrollment
	if err := h.db.Where("student_id = ?", studentID).Order("created_at DESC").First(&enrollment).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Student not enrolled in any class"})
		return
	}
	classID := enrollment.ClassID
	
	// Verify that the subject is a valid standard subject
	var standardSubject models.StandardSubject
	if err := h.db.First(&standardSubject, "id = ?", subjectID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subject - only standard curriculum subjects are allowed"})
		return
	}
	
	// Check if result already exists
	var result models.SubjectResult
	paperNum := 0
	if req.RawMarks != nil {
		if p, ok := req.RawMarks["paper"].(float64); ok {
			paperNum = int(p)
		}
	}
	err = h.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ? AND paper = ?",
		studentID, subjectID, req.Term, req.Year, req.ExamType, paperNum).First(&result).Error
	
	// Get class level to determine grading system
	var class models.Class
	if err := h.db.First(&class, classID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
		return
	}
	
	// Validate marks for nursery and primary levels
	if req.RawMarks != nil {
		ca := 0.0
		exam := 0.0
		if c, ok := req.RawMarks["ca"].(float64); ok {
			ca = c
		}
		if e, ok := req.RawMarks["exam"].(float64); ok {
			exam = e
		}
		
		switch class.Level {
		case "Baby", "Middle", "Top", "Nursery":
			if ca > 100 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "CA mark cannot exceed 100 for nursery levels"})
				return
			}
			if exam > 100 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Exam mark cannot exceed 100 for nursery levels"})
				return
			}
		case "P1", "P2", "P3", "P4", "P5", "P6", "P7":
			if ca > 40 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "CA mark cannot exceed 40 for primary levels"})
				return
			}
			if exam > 60 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Exam mark cannot exceed 60 for primary levels"})
				return
			}
		}
	}
	
	var gradeResult grading.GradeResult
	var total float64
	
	// Apply appropriate grading system based on level
	switch class.Level {
	case "S5", "S6":
		// UACE: Paper-based grading - each paper out of 100
		if req.RawMarks != nil {
			// For Advanced level, marks are stored directly as "mark" out of 100
			mark := 0.0
			if m, ok := req.RawMarks["mark"].(float64); ok {
				mark = m
			} else if e, ok := req.RawMarks["exam"].(float64); ok {
				// Fallback for old format
				mark = e
			}
			
			if mark > 100 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Mark cannot exceed 100 for Advanced level"})
				return
			}
			
			total = mark
			
			// For grading, fetch all papers for this student+subject+exam_type
			var allPapers []models.SubjectResult
			h.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ? AND deleted_at IS NULL",
				studentID, subjectID, req.Term, req.Year, req.ExamType).Find(&allPapers)
			
			paperMarks := []float64{}
			// Always add current paper first
			if mark > 0 {
				paperMarks = append(paperMarks, mark)
			}
			
			// Then add other existing papers
			for _, p := range allPapers {
				if p.Paper != paperNum && p.RawMarks != nil {
					// Get mark from existing paper
					pmark := 0.0
					if m, ok := p.RawMarks["mark"].(float64); ok {
						pmark = m
					} else if t, ok := p.RawMarks["total"].(float64); ok {
						pmark = t
					} else if e, ok := p.RawMarks["exam"].(float64); ok {
						// Fallback for old format
						pca := 0.0
						if c, ok := p.RawMarks["ca"].(float64); ok {
							pca = c
						}
						pmark = pca + e
					}
					if pmark > 0 {
						paperMarks = append(paperMarks, pmark)
					}
				}
			}
			
				if len(paperMarks) >= 2 {
					grader := &grading.UACEGrader{}
					gradeResult = grader.ComputeGradeFromPapers(paperMarks)
					
					// Update grade for all papers of this subject
					for _, p := range allPapers {
						if p.ID != result.ID {
							h.db.Model(&models.SubjectResult{}).Where("id = ?", p.ID).Updates(map[string]interface{}{
								"final_grade":        gradeResult.FinalGrade,
								"computation_reason": gradeResult.ComputationReason,
								"rule_version_hash":  gradeResult.RuleVersionHash,
							})
						}
					}
				} else if len(paperMarks) == 1 {
					// Check if this is a subsidiary subject
					isSubsidiary := standardSubject.Name == "ICT" || 
						standardSubject.Name == "General Paper" ||
						strings.Contains(strings.ToLower(standardSubject.Name), "ict") ||
						strings.Contains(strings.ToLower(standardSubject.Name), "general paper") ||
						strings.Contains(strings.ToLower(standardSubject.Name), "subsidiary")
					
					if isSubsidiary {
						// Subsidiary subjects use O/F grading
						if mark >= 50 {
							gradeResult.FinalGrade = "O"
						} else {
							gradeResult.FinalGrade = "F"
						}
						gradeResult.ComputationReason = fmt.Sprintf("Subsidiary: Paper mark %.2f/100 → Grade %s", mark, gradeResult.FinalGrade)
						gradeResult.RuleVersionHash = "UACE_SUBSIDIARY_V1"
					} else {
						// Principal subjects: Show individual paper grade as letter grade
						grader := &grading.UACEGrader{}
						code := grader.MapMarkToCode(mark)
						
						// Convert code to letter grade for display
						var letterGrade string
						switch code {
						case 1:
							letterGrade = "D1"
						case 2:
							letterGrade = "D2"
						case 3:
							letterGrade = "C3"
						case 4:
							letterGrade = "C4"
						case 5:
							letterGrade = "C5"
						case 6:
							letterGrade = "C6"
						case 7:
							letterGrade = "P7"
						case 8:
							letterGrade = "P8"
						default:
							letterGrade = "F9"
						}
						
						gradeResult.FinalGrade = letterGrade
						gradeResult.ComputationReason = fmt.Sprintf("Single paper: %.2f/100 → Grade %s (awaiting other papers for final grade)", mark, letterGrade)
						gradeResult.RuleVersionHash = "UACE_SINGLE_PAPER_V1"
					}
				} else {
					gradeResult.FinalGrade = ""
					gradeResult.ComputationReason = "No marks entered"
				}
		} else {
			gradeResult.FinalGrade = ""
			gradeResult.ComputationReason = "UACE requires paper-based entry"
		}
	default:
		// For all other levels: extract ca and exam from root
		ca := 0.0
		exam := 0.0
		if req.RawMarks != nil {
			if c, ok := req.RawMarks["ca"].(float64); ok {
				ca = c
			}
			if e, ok := req.RawMarks["exam"].(float64); ok {
				exam = e
			}
		}
		total = ca + exam
		
		switch class.Level {
		case "Baby", "Middle", "Top", "Nursery":
			// Nursery: CA out of 100, Exam out of 100, average
			total = (ca + exam) / 2
			grader := &grading.NurseryGrader{}
			gradeResult = grader.ComputeGrade(ca, exam, 100, 100)
		case "P1", "P2", "P3", "P4", "P5", "P6", "P7":
			// All Primary: CA out of 40, Exam out of 60
			grader := &grading.PrimaryGrader{}
			gradeResult = grader.ComputeGrade(ca, exam, 40, 60)
		case "S1", "S2", "S3", "S4":
			// NCDC: School-Based out of 20 (20%), External out of 80 (80%)
			// CA comes from AOI marks (out of 20)
			aoiCA := 0.0
			var aoiActivity models.IntegrationActivity
			if err := h.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ?",
				studentID, subjectID, req.Term, req.Year).First(&aoiActivity).Error; err == nil {
				// Calculate AOI out of 20
				if aoiActivity.Marks != nil {
					activities := []float64{}
					for i := 1; i <= 5; i++ {
						key := fmt.Sprintf("activity%d", i)
						if val, ok := aoiActivity.Marks[key].(float64); ok {
							activities = append(activities, val)
						}
					}
					if len(activities) > 0 {
						avg := 0.0
						for _, v := range activities {
							avg += v
						}
						avg = avg / float64(len(activities))
						aoiCA = (avg / 3.0) * 20.0
					}
				}
			}
			// Use AOI CA if available, otherwise use provided CA
			if aoiCA > 0 {
				ca = aoiCA
				req.RawMarks["ca"] = aoiCA
			} else {
				// No AOI marks, set CA to 0
				ca = 0
				req.RawMarks["ca"] = 0
			}
			
			// Calculate total based on what's available
			if ca > 0 && exam > 0 {
				// Both CA and Exam provided
				total = ca + exam
			} else if ca > 0 {
				// Only CA (AOI) provided
				total = ca
			} else if exam > 0 {
				// Only Exam provided
				total = exam
			}
			
			grader := &grading.NCDCGrader{}
			gradeResult = grader.ComputeGrade(ca, exam, 20, 80)
		default:
			// Fallback: simple total
			if total >= 80 {
				gradeResult.FinalGrade = "A"
			} else if total >= 65 {
				gradeResult.FinalGrade = "B"
			} else if total >= 50 {
				gradeResult.FinalGrade = "C"
			} else if total >= 35 {
				gradeResult.FinalGrade = "D"
			} else {
				gradeResult.FinalGrade = "E"
			}
			gradeResult.ComputationReason = "Simple total grading"
		}
	}
	
	// Store total/mark in raw_marks
	if req.RawMarks == nil {
		req.RawMarks = make(models.JSONB)
	}
	// For nursery, store average in 'mark' field; for others, store total in 'total' field
	if class.Level == "Baby" || class.Level == "Middle" || class.Level == "Top" || class.Level == "Nursery" {
		req.RawMarks["mark"] = total
	} else {
		req.RawMarks["total"] = total
	}
	
	if err == gorm.ErrRecordNotFound {
		result = models.SubjectResult{
			StudentID:         studentID,
			SubjectID:         subjectID,
			ClassID:           classID,
			Term:              req.Term,
			Year:              req.Year,
			ExamType:          req.ExamType,
			Paper:             paperNum,
			SchoolID:          uuid.MustParse(schoolID),
			FinalGrade:        gradeResult.FinalGrade,
			ComputationReason: gradeResult.ComputationReason,
			RuleVersionHash:   gradeResult.RuleVersionHash,
			RawMarks:          req.RawMarks,
		}
		if err := h.db.Create(&result).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	} else {
		// Merge raw_marks - preserve existing exam types
		if result.RawMarks == nil {
			result.RawMarks = make(models.JSONB)
		}
		for k, v := range req.RawMarks {
			result.RawMarks[k] = v
		}
		result.Paper = paperNum
		result.FinalGrade = gradeResult.FinalGrade
		result.ComputationReason = gradeResult.ComputationReason
		result.RuleVersionHash = gradeResult.RuleVersionHash
		if err := h.db.Save(&result).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	
	// Send grade alert email to guardians
	go func(studentID, subjectID uuid.UUID, grade, term string, year int) {
		var student models.Student
		if err := h.db.First(&student, studentID).Error; err == nil {
			var subject models.StandardSubject
			h.db.First(&subject, subjectID)
			
			var guardians []models.Guardian
			h.db.Where("student_id = ?", studentID).Find(&guardians)
			
			studentName := fmt.Sprintf("%s %s", student.FirstName, student.LastName)
			for _, guardian := range guardians {
				if guardian.Email != "" && h.emailService != nil {
					if err := h.emailService.SendGradeAlert(guardian.Email, studentName, subject.Name, grade, fmt.Sprintf("%s %d", term, year)); err != nil {
						log.Printf("[EMAIL ERROR] Failed to send grade alert to %s for student %s: %v", guardian.Email, studentName, err)
					} else {
						log.Printf("[EMAIL SUCCESS] Grade alert sent to %s for student %s (Subject: %s, Grade: %s)", guardian.Email, studentName, subject.Name, grade)
					}
				}
			}
		}
	}(studentID, subjectID, gradeResult.FinalGrade, req.Term, req.Year)
	
	c.JSON(http.StatusOK, result)
}

func (h *ResultHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.SubjectResult{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Result deleted"})
}

// RecalculateGrades recalculates all grades using current grading logic
func (h *ResultHandler) RecalculateGrades(c *gin.Context) {
	userRole := c.GetString("user_role")
	if userRole != "system_admin" && userRole != "school_admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can recalculate grades"})
		return
	}

	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	level := c.Query("level") // Optional: specific level like "P4", "S1", etc.

	// Get all results to recalculate
	query := h.db.Model(&models.SubjectResult{})
	if schoolID != "" && userRole != "system_admin" {
		query = query.Where("school_id = ?", schoolID)
	}
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}

	var results []models.SubjectResult
	if err := query.Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	updated := 0
	errors := 0
	skipped := 0

	for _, result := range results {
		// Get student's class level
		var enrollment models.Enrollment
		if err := h.db.Where("student_id = ?", result.StudentID).Order("created_at DESC").First(&enrollment).Error; err != nil {
			skipped++
			continue
		}

		var class models.Class
		if err := h.db.First(&class, enrollment.ClassID).Error; err != nil {
			skipped++
			continue
		}

		// Skip if level filter is specified and doesn't match
		if level != "" && class.Level != level {
			skipped++
			continue
		}

		if result.RawMarks == nil {
			skipped++
			continue
		}

		var gradeResult grading.GradeResult
		var newGrade string

		// Recalculate based on level
		switch class.Level {
		case "Baby", "Middle", "Top", "Nursery":
			// Nursery: CA(100) + Exam(100), average
			ca := 0.0
			exam := 0.0
			if c, ok := result.RawMarks["ca"].(float64); ok {
				ca = c
			}
			if e, ok := result.RawMarks["exam"].(float64); ok {
				exam = e
			}
			if ca <= 0 && exam <= 0 {
				skipped++
				continue
			}
			grader := &grading.NurseryGrader{}
			gradeResult = grader.ComputeGrade(ca, exam, 100, 100)
			newGrade = gradeResult.FinalGrade
			// Store average in 'mark' field
			average := (ca + exam) / 2
			result.RawMarks["mark"] = average

		case "P1", "P2", "P3", "P4", "P5", "P6", "P7":
			// Primary: CA(40) + Exam(60) with 40%/60% weighting
			ca := 0.0
			exam := 0.0
			if c, ok := result.RawMarks["ca"].(float64); ok {
				ca = c
			}
			if e, ok := result.RawMarks["exam"].(float64); ok {
				exam = e
			}
			if ca <= 0 && exam <= 0 {
				skipped++
				continue
			}
			grader := &grading.PrimaryGrader{}
			gradeResult = grader.ComputeGrade(ca, exam, 40, 60)
			newGrade = gradeResult.FinalGrade
			// Calculate and update total in raw_marks
			total := (ca/40)*40 + (exam/60)*60
			result.RawMarks["total"] = total

		case "S1", "S2", "S3", "S4":
			// O-Level: AOI(20) + Exam(80) with 20%/80% weighting
			ca := 0.0
			exam := 0.0
			if c, ok := result.RawMarks["ca"].(float64); ok {
				ca = c
			}
			if e, ok := result.RawMarks["exam"].(float64); ok {
				exam = e
			}
			if ca <= 0 && exam <= 0 {
				skipped++
				continue
			}
			grader := &grading.NCDCGrader{}
			gradeResult = grader.ComputeGrade(ca, exam, 20, 80)
			newGrade = gradeResult.FinalGrade
			// Calculate and update total in raw_marks
			total := (ca/20)*20 + (exam/80)*80
			result.RawMarks["total"] = total

		case "S5", "S6":
			// A-Level: Paper-based grading
			mark := 0.0
			if m, ok := result.RawMarks["mark"].(float64); ok {
				mark = m
			} else if t, ok := result.RawMarks["total"].(float64); ok {
				mark = t
			} else if e, ok := result.RawMarks["exam"].(float64); ok {
				if c, ok := result.RawMarks["ca"].(float64); ok {
					mark = c + e
				} else {
					mark = e
				}
			}
			if mark <= 0 {
				skipped++
				continue
			}
			grader := &grading.UACEGrader{}
			code := grader.MapMarkToCode(mark)
			switch code {
			case 1:
				newGrade = "D1"
			case 2:
				newGrade = "D2"
			case 3:
				newGrade = "C3"
			case 4:
				newGrade = "C4"
			case 5:
				newGrade = "C5"
			case 6:
				newGrade = "C6"
			case 7:
				newGrade = "P7"
			case 8:
				newGrade = "P8"
			default:
				newGrade = "F9"
			}
			gradeResult.FinalGrade = newGrade
			gradeResult.ComputationReason = fmt.Sprintf("Recalculated: %.2f/100 → %s", mark, newGrade)

		default:
			skipped++
			continue
		}

		// Update if grade changed
		if result.FinalGrade != newGrade {
			result.FinalGrade = newGrade
			result.ComputationReason = gradeResult.ComputationReason
			result.RuleVersionHash = gradeResult.RuleVersionHash
			
			if err := h.db.Save(&result).Error; err != nil {
				errors++
			} else {
				updated++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Grade recalculation completed",
		"updated": updated,
		"errors":  errors,
		"skipped": skipped,
		"total":   len(results),
	})
}

// GetPerformanceSummary returns comprehensive performance summary with all subjects per class
// GetBulkMarks fetches all marks for a class/subject/term/year in one query
func (h *ResultHandler) GetBulkMarks(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	subjectID := c.Query("subject_id")
	term := c.Query("term")
	year := c.Query("year")
	examType := c.Query("exam_type")
	paperStr := c.Query("paper")
	
	if classID == "" || subjectID == "" || term == "" || year == "" || examType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id, subject_id, term, year, and exam_type are required"})
		return
	}
	
	paper := 0
	if paperStr != "" {
		if p, err := strconv.Atoi(paperStr); err == nil {
			paper = p
		}
	}
	
	type StudentMark struct {
		StudentID string      `json:"student_id"`
		RawMarks  models.JSONB `json:"raw_marks"`
	}
	
	var results []StudentMark
	query := h.db.Table("subject_results").
		Select("student_id, raw_marks").
		Where("school_id = ? AND class_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ?",
			schoolID, classID, subjectID, term, year, examType)
	
	if paper > 0 {
		query = query.Where("paper = ?", paper)
	}
	
	if err := query.Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// Convert to map for easier frontend consumption
	marksMap := make(map[string]models.JSONB)
	for _, result := range results {
		marksMap[result.StudentID] = result.RawMarks
	}
	
	c.JSON(http.StatusOK, gin.H{"marks": marksMap})
}

func (h *ResultHandler) GetPerformanceSummary(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	
	if term == "" || year == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "term and year are required"})
		return
	}
	
	// Get all classes
	var classes []models.Class
	h.db.Where("school_id = ? AND year = ? AND term = ?", schoolID, year, term).Find(&classes)
	
	type SubjectMark struct {
		SubjectName string  `json:"subject_name"`
		CA          float64 `json:"ca"`
		Exam        float64 `json:"exam"`
		Total       float64 `json:"total"`
		Grade       string  `json:"grade"`
	}
	
	type StudentPerformance struct {
		StudentID   string        `json:"student_id"`
		StudentName string        `json:"student_name"`
		AdmissionNo string        `json:"admission_no"`
		ClassName   string        `json:"class_name"`
		Subjects    []SubjectMark `json:"subjects"`
		TotalMarks  float64       `json:"total_marks"`
		Average     float64       `json:"average"`
		Aggregate   int           `json:"aggregate"`
		Grade       string        `json:"grade"`
		Position    int           `json:"position"`
		Division    string        `json:"division"`
	}
	
	var allPerformance []StudentPerformance
	
	for _, class := range classes {
		// Get all students in this class
		var students []models.Student
		h.db.Raw(`
			SELECT DISTINCT s.*
			FROM students s
			JOIN enrollments e ON s.id = e.student_id
			WHERE e.class_id = ? AND e.status = 'active' AND s.school_id = ?
			ORDER BY s.first_name ASC, s.last_name ASC
		`, class.ID, schoolID).Scan(&students)
		
		var classPerformance []StudentPerformance
		
		for _, student := range students {
			// Get all subject results for this student
			var results []struct {
				SubjectName string
				CA          float64
				Exam        float64
				Total       float64
				Grade       string
			}
			
			h.db.Raw(`
				SELECT 
					ss.name as subject_name,
					COALESCE((sr.raw_marks->>'ca')::float, 0) as ca,
					COALESCE((sr.raw_marks->>'exam')::float, 0) as exam,
					COALESCE((sr.raw_marks->>'total')::float, 0) as total,
					COALESCE(sr.final_grade, '') as grade
				FROM subject_results sr
				JOIN standard_subjects ss ON sr.subject_id = ss.id
				WHERE sr.student_id = ?
					AND sr.term = ?
					AND sr.year = ?
					AND sr.school_id = ?
				ORDER BY ss.name
			`, student.ID, term, year, schoolID).Scan(&results)
			
			subjects := []SubjectMark{}
			totalMarks := 0.0
			aggregate := 0 // For P4-P7 aggregate calculation
			
			for _, r := range results {
				subjects = append(subjects, SubjectMark{
					SubjectName: r.SubjectName,
					CA:          r.CA,
					Exam:        r.Exam,
					Total:       r.Total,
					Grade:       r.Grade,
				})
				totalMarks += r.Total
				
				// Calculate aggregate for P4-P7 (sum of grade points)
				if class.Level == "P4" || class.Level == "P5" || class.Level == "P6" || class.Level == "P7" {
					switch r.Grade {
					case "D1":
						aggregate += 1
					case "D2":
						aggregate += 2
					case "C3":
						aggregate += 3
					case "C4":
						aggregate += 4
					case "C5":
						aggregate += 5
					case "C6":
						aggregate += 6
					case "P7":
						aggregate += 7
					case "P8":
						aggregate += 8
					case "F9":
						aggregate += 9
					}
				}
			}
			
			average := 0.0
			if len(subjects) > 0 {
				average = totalMarks / float64(len(subjects))
			}
			
			grade := ""
			division := ""
			
			// For P4-P7, use aggregate-based division
			if class.Level == "P4" || class.Level == "P5" || class.Level == "P6" || class.Level == "P7" {
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
				
				// Set grade based on average for display
				if average >= 80 {
					grade = "A"
				} else if average >= 65 {
					grade = "B"
				} else if average >= 50 {
					grade = "C"
				} else if average >= 35 {
					grade = "D"
				} else {
					grade = "E"
				}
			} else {
				// For other levels, use average-based grading
				if average >= 80 {
					grade = "A"
					division = "I"
				} else if average >= 65 {
					grade = "B"
					division = "II"
				} else if average >= 50 {
					grade = "C"
					division = "III"
				} else if average >= 35 {
					grade = "D"
					division = "IV"
				} else {
					grade = "E"
					division = "U"
				}
			}
			
			studentName := student.FirstName
			if student.MiddleName != "" {
				studentName += " " + student.MiddleName
			}
			studentName += " " + student.LastName
			
			classPerformance = append(classPerformance, StudentPerformance{
				StudentID:   student.ID.String(),
				StudentName: studentName,
				AdmissionNo: student.AdmissionNo,
				ClassName:   class.Name,
				Subjects:    subjects,
				TotalMarks:  totalMarks,
				Average:     average,
				Aggregate:   aggregate,
				Grade:       grade,
				Division:    division,
			})
		}
		
		// Sort by total marks descending and assign positions
		for i := 0; i < len(classPerformance); i++ {
			for j := i + 1; j < len(classPerformance); j++ {
				if classPerformance[j].TotalMarks > classPerformance[i].TotalMarks {
					classPerformance[i], classPerformance[j] = classPerformance[j], classPerformance[i]
				}
			}
		}
		
		for i := range classPerformance {
			classPerformance[i].Position = i + 1
		}
		
		allPerformance = append(allPerformance, classPerformance...)
	}
	
	c.JSON(http.StatusOK, gin.H{"results": allPerformance})
}

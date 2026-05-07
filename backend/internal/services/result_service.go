package services

import (
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/grading"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type ResultService struct {
	repo         repositories.ResultRepository
	db           *gorm.DB
	emailService *EmailService
}

type ResultWithSubject struct {
	models.SubjectResult
	SubjectName string `json:"subject_name"`
	SubjectCode string `json:"subject_code"`
	Position    string `json:"position"`
}

func NewResultService(repo repositories.ResultRepository, db *gorm.DB, emailService *EmailService) *ResultService {
	return &ResultService{
		repo:         repo,
		db:           db,
		emailService: emailService,
	}
}

func (s *ResultService) GetDB() *gorm.DB {
	return s.db
}

func (s *ResultService) GetStudentResults(studentID, schoolID, term, year, examType string) ([]map[string]interface{}, float64, error) {
	var student models.Student
	if err := s.db.Where("id = ? AND school_id = ?", studentID, schoolID).First(&student).Error; err != nil {
		return nil, 0, fmt.Errorf("student not found")
	}

	// Get class level
	var enrollment models.Enrollment
	var classLevel string
	if err := s.db.Where("student_id = ?", studentID).Order("created_at DESC").First(&enrollment).Error; err == nil {
		var class models.Class
		if err := s.db.First(&class, enrollment.ClassID).Error; err == nil {
			classLevel = class.Level
		}
	}

	// For S5/S6, group papers by subject
	if classLevel == "S5" || classLevel == "S6" {
		return s.getAdvancedLevelResults(studentID, schoolID, term, year, examType)
	}

	// For other levels, use existing logic
	var results []ResultWithSubject
	query := s.db.Table("subject_results").
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
		return nil, 0, err
	}

	// Recalculate grades for S1-S4 with AOI marks
	if classLevel == "S1" || classLevel == "S2" || classLevel == "S3" || classLevel == "S4" {
		s.recalculateNCDCGrades(&results, studentID, term, year)
	}

	// Calculate position
	position := s.calculatePosition(studentID, schoolID, term, year, examType, enrollment.ClassID)

	// Get outstanding fees
	outstandingFees := s.getOutstandingFees(studentID, term, year)

	// Convert to map format
	resultMaps := make([]map[string]interface{}, len(results))
	for i, r := range results {
		resultMaps[i] = map[string]interface{}{
			"id":                 r.ID,
			"student_id":         r.StudentID,
			"subject_id":         r.SubjectID,
			"subject_name":       r.SubjectName,
			"subject_code":       r.SubjectCode,
			"term":               r.Term,
			"year":               r.Year,
			"exam_type":          r.ExamType,
			"final_grade":        r.FinalGrade,
			"raw_marks":          r.RawMarks,
			"computation_reason": r.ComputationReason,
			"position":           position,
		}
	}

	return resultMaps, outstandingFees, nil
}

func (s *ResultService) CreateOrUpdateResult(req *models.SubjectResult, schoolID, userID string) (*models.SubjectResult, error) {
	req.SchoolID = uuid.MustParse(schoolID)

	// Verify student
	var student models.Student
	if err := s.db.Where("id = ? AND school_id = ?", req.StudentID, schoolID).First(&student).Error; err != nil {
		return nil, fmt.Errorf("student not found")
	}

	// Get class
	var enrollment models.Enrollment
	if err := s.db.Where("student_id = ?", req.StudentID).Order("created_at DESC").First(&enrollment).Error; err != nil {
		return nil, fmt.Errorf("student not enrolled")
	}
	req.ClassID = enrollment.ClassID

	var class models.Class
	if err := s.db.First(&class, enrollment.ClassID).Error; err != nil {
		return nil, fmt.Errorf("class not found")
	}

	// For S5/S6, extract paper number from raw_marks if not set
	if (class.Level == "S5" || class.Level == "S6") && req.Paper == 0 && req.RawMarks != nil {
		// Try float64 first (from JSON)
		if paperNum, ok := req.RawMarks["paper"].(float64); ok {
			req.Paper = int(paperNum)
		} else if paperNum, ok := req.RawMarks["paper"].(int); ok {
			// Try int
			req.Paper = paperNum
		}
	}

	// Validate marks
	if err := s.validateMarks(req, &class); err != nil {
		return nil, err
	}

	// Calculate grade
	gradeResult := s.calculateGrade(req, &class)
	req.FinalGrade = gradeResult.FinalGrade
	req.ComputationReason = gradeResult.ComputationReason
	req.RuleVersionHash = gradeResult.RuleVersionHash

	// Store total
	if req.RawMarks == nil {
		req.RawMarks = make(models.JSONB)
	}
	s.storeTotalMark(req, &class)

	// Create or update
	existing, err := s.repo.FindExisting(req.StudentID, req.SubjectID, req.Term, fmt.Sprintf("%d", req.Year), req.ExamType, req.Paper)
	if err == gorm.ErrRecordNotFound {
		if err := s.repo.Create(req); err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		// Merge raw_marks
		if existing.RawMarks == nil {
			existing.RawMarks = make(models.JSONB)
		}
		for k, v := range req.RawMarks {
			existing.RawMarks[k] = v
		}
		existing.FinalGrade = req.FinalGrade
		existing.ComputationReason = req.ComputationReason
		existing.RuleVersionHash = req.RuleVersionHash
		if err := s.repo.Update(existing); err != nil {
			return nil, err
		}
		req = existing
	}

	// For S5/S6, update all papers with final grade if we have 2+ papers
	if class.Level == "S5" || class.Level == "S6" {
		s.updateAllPapersWithFinalGrade(req.StudentID, req.SubjectID, req.Term, req.Year, &class)
	}

	// Send grade alert
	go s.sendGradeAlert(req.StudentID, req.SubjectID, gradeResult.FinalGrade, req.Term, req.Year)

	return req, nil
}

func (s *ResultService) RecalculateGrades(schoolID, term, year, level string) (int, int, int, error) {
	query := s.db.Model(&models.SubjectResult{}).Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}

	var results []models.SubjectResult
	if err := query.Find(&results).Error; err != nil {
		return 0, 0, 0, err
	}

	updated, errors, skipped := 0, 0, 0

	for _, result := range results {
		var enrollment models.Enrollment
		if err := s.db.Where("student_id = ?", result.StudentID).Order("created_at DESC").First(&enrollment).Error; err != nil {
			skipped++
			continue
		}

		var class models.Class
		if err := s.db.First(&class, enrollment.ClassID).Error; err != nil {
			skipped++
			continue
		}

		if level != "" && class.Level != level {
			skipped++
			continue
		}

		if result.RawMarks == nil {
			skipped++
			continue
		}

		gradeResult := s.calculateGrade(&result, &class)
		if result.FinalGrade != gradeResult.FinalGrade {
			result.FinalGrade = gradeResult.FinalGrade
			result.ComputationReason = gradeResult.ComputationReason
			result.RuleVersionHash = gradeResult.RuleVersionHash

			if err := s.db.Save(&result).Error; err != nil {
				errors++
			} else {
				updated++
			}
		}
	}

	return updated, errors, skipped, nil
}

func (s *ResultService) GetBulkMarks(schoolID, classID, subjectID, term, year, examType string, paper int) (map[string]models.JSONB, error) {
	type StudentMark struct {
		StudentID string       `json:"student_id"`
		RawMarks  models.JSONB `json:"raw_marks"`
	}

	var results []StudentMark
	query := s.db.Table("subject_results").
		Select("student_id, raw_marks").
		Where("school_id = ? AND class_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ?",
			schoolID, classID, subjectID, term, year, examType)

	if paper > 0 {
		query = query.Where("paper = ?", paper)
	}

	if err := query.Scan(&results).Error; err != nil {
		return nil, err
	}

	marksMap := make(map[string]models.JSONB)
	for _, result := range results {
		marksMap[result.StudentID] = result.RawMarks
	}

	return marksMap, nil
}

// Helper methods

func (s *ResultService) recalculateNCDCGrades(results *[]ResultWithSubject, studentID, term, year string) {
	grader := &grading.NCDCGrader{}
	for i := range *results {
		var aoiActivity models.IntegrationActivity
		if err := s.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ?",
			studentID, (*results)[i].SubjectID, term, year).First(&aoiActivity).Error; err == nil {
			if aoiActivity.Marks != nil {
				activities := []float64{}
				for j := 1; j <= 5; j++ {
					if val, ok := aoiActivity.Marks[fmt.Sprintf("activity%d", j)].(float64); ok {
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

					if (*results)[i].RawMarks == nil {
						(*results)[i].RawMarks = make(models.JSONB)
					}
					(*results)[i].RawMarks["ca"] = aoiCA

					exam := 0.0
					if e, ok := (*results)[i].RawMarks["exam"].(float64); ok {
						exam = e
					}
					(*results)[i].RawMarks["total"] = aoiCA + exam

					gradeResult := grader.ComputeGrade(aoiCA, exam, 20, 80)
					(*results)[i].FinalGrade = gradeResult.FinalGrade
				}
			}
		}
	}
}

func (s *ResultService) calculatePosition(studentID, schoolID, term, year, examType string, classID uuid.UUID) string {
	if term == "" || year == "" || examType == "" {
		return "N/A"
	}

	type StudentTotal struct {
		StudentID string
		Total     float64
	}

	var studentTotals []StudentTotal
	s.db.Raw(`
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
	`, classID, term, year, examType, schoolID).Scan(&studentTotals)

	for i, st := range studentTotals {
		if st.StudentID == studentID {
			return fmt.Sprintf("%d out of %d", i+1, len(studentTotals))
		}
	}

	return "N/A"
}

func (s *ResultService) getOutstandingFees(studentID, term, year string) float64 {
	if term == "" || year == "" {
		return 0
	}

	var studentFees models.StudentFees
	if err := s.db.Session(&gorm.Session{Logger: s.db.Logger.LogMode(1)}).
		Where("student_id = ? AND term = ? AND year = ?", studentID, term, year).
		First(&studentFees).Error; err == nil {
		return studentFees.Outstanding
	}
	return 0
}

func (s *ResultService) validateMarks(req *models.SubjectResult, class *models.Class) error {
	if req.RawMarks == nil {
		return nil
	}

	ca, exam := 0.0, 0.0
	if c, ok := req.RawMarks["ca"].(float64); ok {
		ca = c
	}
	if e, ok := req.RawMarks["exam"].(float64); ok {
		exam = e
	}

	switch class.Level {
	case "Baby", "Middle", "Top", "Nursery":
		if ca > 100 || exam > 100 {
			return fmt.Errorf("marks cannot exceed 100 for nursery levels")
		}
	case "P1", "P2", "P3", "P4", "P5", "P6", "P7":
		if ca > 40 {
			return fmt.Errorf("CA mark cannot exceed 40 for primary levels")
		}
		if exam > 60 {
			return fmt.Errorf("Exam mark cannot exceed 60 for primary levels")
		}
	case "S5", "S6":
		if mark, ok := req.RawMarks["mark"].(float64); ok && mark > 100 {
			return fmt.Errorf("mark cannot exceed 100 for Advanced level")
		}
	}

	return nil
}

func (s *ResultService) calculateGrade(req *models.SubjectResult, class *models.Class) grading.GradeResult {
	switch class.Level {
	case "S5", "S6":
		return s.calculateUACEGrade(req, class)
	case "Baby", "Middle", "Top", "Nursery":
		return s.calculateNurseryGrade(req)
	case "P1", "P2", "P3", "P4", "P5", "P6", "P7":
		return s.calculatePrimaryGrade(req)
	case "S1", "S2", "S3", "S4":
		return s.calculateNCDCGrade(req)
	default:
		return s.calculateSimpleGrade(req)
	}
}

func (s *ResultService) calculateUACEGrade(req *models.SubjectResult, _ *models.Class) grading.GradeResult {
	if req.RawMarks == nil {
		return grading.GradeResult{FinalGrade: "", ComputationReason: "No marks"}
	}

	mark := 0.0
	if m, ok := req.RawMarks["mark"].(float64); ok {
		mark = m
	} else if e, ok := req.RawMarks["exam"].(float64); ok {
		mark = e
	}

	// Check if subsidiary
	var standardSubject models.StandardSubject
	isSubsidiary := false
	if err := s.db.First(&standardSubject, req.SubjectID).Error; err == nil {
		isSubsidiary = standardSubject.Papers == 1
	}

	grader := &grading.UACEGrader{}

	if isSubsidiary {
		// Subsidiary: Pass (O) if code ≤7 (mark ≥50%), Fail (F) if code >7
		code := grader.MapMarkToCode(mark)
		if code <= 7 {
			return grading.GradeResult{
				FinalGrade:        "O",
				ComputationReason: fmt.Sprintf("Subsidiary subject: %.2f/100 → Code %d → O (Pass, 1 point)", mark, code),
				RuleVersionHash:   "SUBSIDIARY_V1",
			}
		}
		return grading.GradeResult{
			FinalGrade:        "F",
			ComputationReason: fmt.Sprintf("Subsidiary subject: %.2f/100 → Code %d → F (Fail, 0 points)", mark, code),
			RuleVersionHash:   "SUBSIDIARY_V1",
		}
	}

	// Principal subjects: Get all papers for this subject
	var allPapers []models.SubjectResult
	s.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND deleted_at IS NULL",
		req.StudentID, req.SubjectID, req.Term, req.Year).Find(&allPapers)

	// Collect all paper marks including current one
	paperMarks := []float64{}
	
	// Add marks from existing papers
	for _, p := range allPapers {
		// Skip the current paper if it's already in the database
		if req.ID != uuid.Nil && p.ID == req.ID {
			continue
		}
		// For new records, skip if same paper number (avoid duplicates)
		if req.ID == uuid.Nil && p.Paper == req.Paper {
			continue
		}
		if p.RawMarks != nil {
			if pm, ok := p.RawMarks["mark"].(float64); ok && pm > 0 {
				paperMarks = append(paperMarks, pm)
			} else if pm, ok := p.RawMarks["exam"].(float64); ok && pm > 0 {
				paperMarks = append(paperMarks, pm)
			}
		}
	}
	
	// Add current paper mark
	if mark > 0 {
		paperMarks = append(paperMarks, mark)
	}

	// If we have 2+ papers, compute final grade using standard UACE grader
	if len(paperMarks) >= 2 {
		gradeResult := grader.ComputeGradeFromPapers(paperMarks)
		return gradeResult
	}

	// Single paper - show individual code but no final grade yet
	code := grader.MapMarkToCode(mark)
	letterGrade := s.mapCodeToLetterGrade(code)
	
	gradeResult := grading.GradeResult{
		FinalGrade:        letterGrade,
		ComputationReason: fmt.Sprintf("Paper mark %.2f/100 → Code %d (%s). Awaiting %d more paper(s) for final grade.", mark, code, letterGrade, standardSubject.Papers-len(paperMarks)),
		RuleVersionHash:   "UACE_SINGLE_PAPER_V1",
	}
	return gradeResult
}

func (s *ResultService) calculateNurseryGrade(req *models.SubjectResult) grading.GradeResult {
	ca, exam := 0.0, 0.0
	if req.RawMarks != nil {
		if c, ok := req.RawMarks["ca"].(float64); ok {
			ca = c
		}
		if e, ok := req.RawMarks["exam"].(float64); ok {
			exam = e
		}
	}
	grader := &grading.NurseryGrader{}
	return grader.ComputeGrade(ca, exam, 100, 100)
}

func (s *ResultService) calculatePrimaryGrade(req *models.SubjectResult) grading.GradeResult {
	ca, exam := 0.0, 0.0
	if req.RawMarks != nil {
		if c, ok := req.RawMarks["ca"].(float64); ok {
			ca = c
		}
		if e, ok := req.RawMarks["exam"].(float64); ok {
			exam = e
		}
	}
	grader := &grading.PrimaryGrader{}
	return grader.ComputeGrade(ca, exam, 40, 60)
}

func (s *ResultService) calculateNCDCGrade(req *models.SubjectResult) grading.GradeResult {
	ca, exam := 0.0, 0.0
	if req.RawMarks != nil {
		if c, ok := req.RawMarks["ca"].(float64); ok {
			ca = c
		}
		if e, ok := req.RawMarks["exam"].(float64); ok {
			exam = e
		}
	}

	// Get AOI marks
	var aoiActivity models.IntegrationActivity
	if err := s.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ?",
		req.StudentID, req.SubjectID, req.Term, req.Year).First(&aoiActivity).Error; err == nil {
		if aoiActivity.Marks != nil {
			activities := []float64{}
			for i := 1; i <= 5; i++ {
				if val, ok := aoiActivity.Marks[fmt.Sprintf("activity%d", i)].(float64); ok {
					activities = append(activities, val)
				}
			}
			if len(activities) > 0 {
				avg := 0.0
				for _, v := range activities {
					avg += v
				}
				avg = avg / float64(len(activities))
				ca = math.Round((avg / 3.0) * 20.0)
				req.RawMarks["ca"] = ca
			}
		}
	}

	grader := &grading.NCDCGrader{}
	return grader.ComputeGrade(ca, exam, 20, 80)
}

func (s *ResultService) calculateSimpleGrade(req *models.SubjectResult) grading.GradeResult {
	total := 0.0
	if req.RawMarks != nil {
		if ca, ok := req.RawMarks["ca"].(float64); ok {
			total += ca
		}
		if exam, ok := req.RawMarks["exam"].(float64); ok {
			total += exam
		}
	}

	grade := "E"
	if total >= 80 {
		grade = "A"
	} else if total >= 65 {
		grade = "B"
	} else if total >= 50 {
		grade = "C"
	} else if total >= 35 {
		grade = "D"
	}

	return grading.GradeResult{FinalGrade: grade, ComputationReason: "Simple grading"}
}

func (s *ResultService) storeTotalMark(req *models.SubjectResult, class *models.Class) {
	if req.RawMarks == nil {
		return
	}

	ca, exam := 0.0, 0.0
	if c, ok := req.RawMarks["ca"].(float64); ok {
		ca = c
	}
	if e, ok := req.RawMarks["exam"].(float64); ok {
		exam = e
	}

	if class.Level == "Baby" || class.Level == "Middle" || class.Level == "Top" || class.Level == "Nursery" {
		req.RawMarks["mark"] = (ca + exam) / 2
	} else {
		req.RawMarks["total"] = ca + exam
	}
}

func (s *ResultService) DeleteResult(id, schoolID string) error {
	result := s.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.SubjectResult{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("result not found")
	}
	return nil
}

func (s *ResultService) GetPerformanceSummary(schoolID, term, year string) ([]map[string]interface{}, error) {
	var classes []models.Class
	s.db.Where("school_id = ? AND year = ? AND term = ?", schoolID, year, term).Find(&classes)

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

	allPerformance := []map[string]interface{}{}

	for _, class := range classes {
		var students []models.Student
		s.db.Raw(`
			SELECT DISTINCT s.*
			FROM students s
			JOIN enrollments e ON s.id = e.student_id
			WHERE e.class_id = ? AND e.status = 'active' AND s.school_id = ?
			ORDER BY s.first_name ASC, s.last_name ASC
		`, class.ID, schoolID).Scan(&students)

		classPerformance := []StudentPerformance{}

		for _, student := range students {
			var results []struct {
				SubjectName string
				CA          float64
				Exam        float64
				Total       float64
				Grade       string
			}

			s.db.Raw(`
				SELECT 
					ss.name as subject_name,
					COALESCE((sr.raw_marks->>'ca')::float, 0) as ca,
					COALESCE((sr.raw_marks->>'exam')::float, 0) as exam,
					COALESCE((sr.raw_marks->>'total')::float, 0) as total,
					COALESCE(sr.final_grade, '') as grade
				FROM subject_results sr
				JOIN standard_subjects ss ON sr.subject_id = ss.id
				WHERE sr.student_id = ? AND sr.term = ? AND sr.year = ? AND sr.school_id = ?
				ORDER BY ss.name
			`, student.ID, term, year, schoolID).Scan(&results)

			subjects := []SubjectMark{}
			totalMarks := 0.0
			aggregate := 0

			for _, r := range results {
				subjects = append(subjects, SubjectMark{
					SubjectName: r.SubjectName,
					CA:          r.CA,
					Exam:        r.Exam,
					Total:       r.Total,
					Grade:       r.Grade,
				})
				totalMarks += r.Total

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

			grade, division := s.calculateGradeAndDivision(average, aggregate, class.Level)

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

		// Sort by total marks descending
		for i := 0; i < len(classPerformance); i++ {
			for j := i + 1; j < len(classPerformance); j++ {
				if classPerformance[j].TotalMarks > classPerformance[i].TotalMarks {
					classPerformance[i], classPerformance[j] = classPerformance[j], classPerformance[i]
				}
			}
		}

		// Assign positions
		for i := range classPerformance {
			classPerformance[i].Position = i + 1
		}

		// Convert to map
		for _, perf := range classPerformance {
			allPerformance = append(allPerformance, map[string]interface{}{
				"student_id":   perf.StudentID,
				"student_name": perf.StudentName,
				"admission_no": perf.AdmissionNo,
				"class_name":   perf.ClassName,
				"subjects":     perf.Subjects,
				"total_marks":  perf.TotalMarks,
				"average":      perf.Average,
				"aggregate":    perf.Aggregate,
				"grade":        perf.Grade,
				"position":     perf.Position,
				"division":     perf.Division,
			})
		}
	}

	return allPerformance, nil
}

func (s *ResultService) calculateGradeAndDivision(average float64, aggregate int, level string) (string, string) {
	grade := ""
	division := ""

	if level == "P4" || level == "P5" || level == "P6" || level == "P7" {
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

	return grade, division
}

// mapCodeToLetterGrade converts UNEB code to letter grade
func (s *ResultService) mapCodeToLetterGrade(code int) string {
	switch code {
	case 1:
		return "D1"
	case 2:
		return "D2"
	case 3:
		return "C3"
	case 4:
		return "C4"
	case 5:
		return "C5"
	case 6:
		return "C6"
	case 7:
		return "P7"
	case 8:
		return "P8"
	default:
		return "F9"
	}
}

func (s *ResultService) sendGradeAlert(studentID, subjectID uuid.UUID, grade, term string, year int) {
	if s.emailService == nil {
		return
	}

	var student models.Student
	if err := s.db.First(&student, studentID).Error; err != nil {
		return
	}

	var subject models.StandardSubject
	s.db.First(&subject, subjectID)

	var guardians []models.Guardian
	s.db.Where("student_id = ?", studentID).Find(&guardians)

	studentName := fmt.Sprintf("%s %s", student.FirstName, student.LastName)
	for _, guardian := range guardians {
		if guardian.Email != "" {
			s.emailService.SendGradeAlert(guardian.Email, studentName, subject.Name, grade, fmt.Sprintf("%s %d", term, year))
		}
	}
}

// updateAllPapersWithFinalGrade updates all paper records with the final aggregated grade
func (s *ResultService) updateAllPapersWithFinalGrade(studentID, subjectID uuid.UUID, term string, year int, _ *models.Class) {
	// Get all papers for this subject, term, year
	var allPapers []models.SubjectResult
	s.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND deleted_at IS NULL",
		studentID, subjectID, term, year).Find(&allPapers)

	// Check if subsidiary
	var standardSubject models.StandardSubject
	isSubsidiary := false
	if err := s.db.First(&standardSubject, subjectID).Error; err == nil {
		isSubsidiary = standardSubject.Papers == 1
	}

	// Subsidiary subjects don't aggregate papers - each paper is independent
	if isSubsidiary {
		return
	}

	// Need at least 2 papers to compute final grade
	if len(allPapers) < 2 {
		return
	}

	// Collect all paper marks
	paperMarks := []float64{}
	for _, p := range allPapers {
		if p.RawMarks != nil {
			if mark, ok := p.RawMarks["mark"].(float64); ok && mark > 0 {
				paperMarks = append(paperMarks, mark)
			} else if mark, ok := p.RawMarks["exam"].(float64); ok && mark > 0 {
				paperMarks = append(paperMarks, mark)
			}
		}
	}

	if len(paperMarks) < 2 {
		return
	}

	// Compute final grade using standard UACE grader
	grader := &grading.UACEGrader{}
	gradeResult := grader.ComputeGradeFromPapers(paperMarks)

	// Update all paper records with the final grade
	for i := range allPapers {
		allPapers[i].FinalGrade = gradeResult.FinalGrade
		allPapers[i].ComputationReason = gradeResult.ComputationReason
		allPapers[i].RuleVersionHash = gradeResult.RuleVersionHash
		s.db.Save(&allPapers[i])
	}
}

// getAdvancedLevelResults returns grouped results for S5/S6 with all papers shown
func (s *ResultService) getAdvancedLevelResults(studentID, schoolID, term, year, examType string) ([]map[string]interface{}, float64, error) {
	query := `
		SELECT 
			ss.id as subject_id,
			ss.name as subject_name,
			ss.code as subject_code,
			ss.papers as num_papers,
			MAX(CASE WHEN sr.paper = 1 THEN COALESCE((sr.raw_marks->>'mark')::float, (sr.raw_marks->>'exam')::float) END) as paper1,
			MAX(CASE WHEN sr.paper = 2 THEN COALESCE((sr.raw_marks->>'mark')::float, (sr.raw_marks->>'exam')::float) END) as paper2,
			MAX(CASE WHEN sr.paper = 3 THEN COALESCE((sr.raw_marks->>'mark')::float, (sr.raw_marks->>'exam')::float) END) as paper3,
			MAX(CASE WHEN sr.paper = 4 THEN COALESCE((sr.raw_marks->>'mark')::float, (sr.raw_marks->>'exam')::float) END) as paper4,
			MAX(sr.final_grade) as final_grade,
			MAX(sr.computation_reason) as computation_reason,
			MAX(sr.term) as term,
			MAX(sr.year) as year,
			MAX(sr.exam_type) as exam_type
		FROM subject_results sr
		JOIN standard_subjects ss ON sr.subject_id = ss.id
		WHERE sr.student_id = $1 
			AND sr.school_id = $2
			AND sr.deleted_at IS NULL
	`

	params := []interface{}{studentID, schoolID}
	paramCount := 2

	if term != "" {
		paramCount++
		query += fmt.Sprintf(" AND sr.term = $%d", paramCount)
		params = append(params, term)
	}
	if year != "" {
		paramCount++
		query += fmt.Sprintf(" AND sr.year = $%d", paramCount)
		params = append(params, year)
	}
	if examType != "" {
		paramCount++
		query += fmt.Sprintf(" AND sr.exam_type = $%d", paramCount)
		params = append(params, examType)
	}

	query += `
		GROUP BY ss.id, ss.name, ss.code, ss.papers
		ORDER BY ss.name
	`

	type GroupedResult struct {
		SubjectID         string
		SubjectName       string
		SubjectCode       string
		NumPapers         int
		Paper1            *float64
		Paper2            *float64
		Paper3            *float64
		Paper4            *float64
		FinalGrade        string
		ComputationReason string
		Term              string
		Year              int
		ExamType          string
	}

	var results []GroupedResult
	if err := s.db.Raw(query, params...).Scan(&results).Error; err != nil {
		return nil, 0, err
	}

	// Get outstanding fees
	outstandingFees := s.getOutstandingFees(studentID, term, year)

	// Convert to map format
	resultMaps := make([]map[string]interface{}, len(results))
	for i, r := range results {
		resultMaps[i] = map[string]interface{}{
			"subject_id":         r.SubjectID,
			"subject_name":       r.SubjectName,
			"subject_code":       r.SubjectCode,
			"num_papers":         r.NumPapers,
			"paper1":             r.Paper1,
			"paper2":             r.Paper2,
			"paper3":             r.Paper3,
			"paper4":             r.Paper4,
			"final_grade":        r.FinalGrade,
			"computation_reason": r.ComputationReason,
			"term":               r.Term,
			"year":               r.Year,
			"exam_type":          r.ExamType,
		}
	}

	return resultMaps, outstandingFees, nil
}

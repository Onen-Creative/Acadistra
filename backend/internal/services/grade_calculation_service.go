package services

import (
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/grading"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// GradeCalculationService handles all grade calculations consistently
type GradeCalculationService struct {
	db *gorm.DB
}

// NewGradeCalculationService creates a new grade calculation service
func NewGradeCalculationService(db *gorm.DB) *GradeCalculationService {
	return &GradeCalculationService{db: db}
}

// CalculateGradeForResult calculates grade for a subject result with proper AOI/CA lookup
func (s *GradeCalculationService) CalculateGradeForResult(
	level string,
	studentID, subjectID uuid.UUID,
	term string,
	year int,
	examMark float64,
	existingCA *float64, // Optional: if CA is already known
) (grading.GradeResult, models.JSONB, error) {
	
	rawMarks := models.JSONB{"exam": examMark}
	
	switch level {
	case "S1", "S2", "S3", "S4":
		// NCDC (O-Level): Always fetch AOI marks from integration_activities
		aoiCA := s.getAOIMarks(studentID, subjectID, term, year)
		rawMarks["ca"] = aoiCA
		rawMarks["total"] = aoiCA + examMark
		
		// Use standard NCDC grader from grading package
		grader := &grading.NCDCGrader{}
		gradeResult := grader.ComputeGrade(aoiCA, examMark, 20, 80)
		return gradeResult, rawMarks, nil
		
	case "P1", "P2", "P3", "P4", "P5", "P6", "P7":
		// Primary: Use provided CA or 0
		ca := 0.0
		if existingCA != nil {
			ca = *existingCA
		}
		rawMarks["ca"] = ca
		rawMarks["total"] = ca + examMark
		
		// Use standard Primary grader from grading package
		grader := &grading.PrimaryGrader{}
		gradeResult := grader.ComputeGrade(ca, examMark, 40, 60)
		return gradeResult, rawMarks, nil
		
	case "Baby", "Middle", "Top", "Nursery":
		// Nursery: Use provided CA or 0
		ca := 0.0
		if existingCA != nil {
			ca = *existingCA
		}
		rawMarks["ca"] = ca
		avg := (ca + examMark) / 2
		rawMarks["mark"] = avg
		
		// Use standard Nursery grader from grading package
		grader := &grading.NurseryGrader{}
		gradeResult := grader.ComputeGrade(ca, examMark, 100, 100)
		return gradeResult, rawMarks, nil
		
	case "S5", "S6":
		// UACE (A-Level): Paper-based grading
		rawMarks["mark"] = examMark
		
		// Check if subsidiary subject
		var standardSubject models.StandardSubject
		isSubsidiary := false
		if err := s.db.First(&standardSubject, subjectID).Error; err == nil {
			isSubsidiary = standardSubject.Papers == 1
		}
		
		grader := &grading.UACEGrader{}
		
		if isSubsidiary {
			// Subsidiary: Pass (O) if code ≤7 (mark ≥50%), Fail (F) if code >7
			code := grader.MapMarkToCode(examMark)
			if code <= 7 {
				return grading.GradeResult{
					FinalGrade:        "O",
					ComputationReason: fmt.Sprintf("Subsidiary subject: %.2f/100 → Code %d → O (Pass, 1 point)", examMark, code),
					RuleVersionHash:   "SUBSIDIARY_V1",
				}, rawMarks, nil
			}
			return grading.GradeResult{
				FinalGrade:        "F",
				ComputationReason: fmt.Sprintf("Subsidiary subject: %.2f/100 → Code %d → F (Fail, 0 points)", examMark, code),
				RuleVersionHash:   "SUBSIDIARY_V1",
			}, rawMarks, nil
		}
		
		// Principal subjects: Get all papers for this subject
		var allPapers []models.SubjectResult
		s.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND deleted_at IS NULL",
			studentID, subjectID, term, year).Find(&allPapers)
		
		// Collect all paper marks including current one
		paperMarks := []float64{examMark}
		for _, p := range allPapers {
			if p.RawMarks != nil {
				if pm, ok := p.RawMarks["mark"].(float64); ok && pm > 0 {
					paperMarks = append(paperMarks, pm)
				} else if pm, ok := p.RawMarks["exam"].(float64); ok && pm > 0 {
					paperMarks = append(paperMarks, pm)
				}
			}
		}
		
		// If we have 2+ papers, compute final grade using standard UACE grader
		if len(paperMarks) >= 2 {
			gradeResult := grader.ComputeGradeFromPapers(paperMarks)
			return gradeResult, rawMarks, nil
		}
		
		// Single paper - show individual code but no final grade yet
		code := grader.MapMarkToCode(examMark)
		letterGrade := s.mapCodeToLetterGrade(code)
		
		gradeResult := grading.GradeResult{
			FinalGrade:        letterGrade,
			ComputationReason: fmt.Sprintf("Paper mark %.2f/100 → Code %d (%s). Awaiting %d more paper(s) for final grade.", examMark, code, letterGrade, standardSubject.Papers-len(paperMarks)),
			RuleVersionHash:   "UACE_SINGLE_PAPER_V1",
		}
		return gradeResult, rawMarks, nil
	}
	
	return grading.GradeResult{
		FinalGrade:        "",
		ComputationReason: "Unknown level",
	}, rawMarks, fmt.Errorf("unknown level: %s", level)
}

// RecalculateGradeWithCA recalculates grade when CA is updated (for Primary/Nursery)
func (s *GradeCalculationService) RecalculateGradeWithCA(
	level string,
	caMark, examMark float64,
) (grading.GradeResult, models.JSONB) {
	
	rawMarks := models.JSONB{"ca": caMark, "exam": examMark}
	
	switch level {
	case "P1", "P2", "P3", "P4", "P5", "P6", "P7":
		rawMarks["total"] = caMark + examMark
		grader := &grading.PrimaryGrader{}
		return grader.ComputeGrade(caMark, examMark, 40, 60), rawMarks
		
	case "Baby", "Middle", "Top", "Nursery":
		avg := (caMark + examMark) / 2
		rawMarks["mark"] = avg
		grader := &grading.NurseryGrader{}
		return grader.ComputeGrade(caMark, examMark, 100, 100), rawMarks
	}
	
	return grading.GradeResult{
		FinalGrade:        "",
		ComputationReason: "Invalid level for CA recalculation",
	}, rawMarks
}

// UpdateAllResultsWithAOI updates all subject results when AOI marks change (S1-S4 only)
func (s *GradeCalculationService) UpdateAllResultsWithAOI(
	studentID, subjectID uuid.UUID,
	term string,
	year int,
	aoiMarks models.JSONB,
) error {
	
	// Calculate AOI CA out of 20
	aoiCA := s.calculateAOICA(aoiMarks)
	
	// Find all subject results for this student, subject, term, and year
	var results []models.SubjectResult
	if err := s.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ?",
		studentID, subjectID, term, year).Find(&results).Error; err != nil {
		return err
	}
	
	// Update all existing results with new AOI CA using standard NCDC grader
	grader := &grading.NCDCGrader{}
	
	for _, result := range results {
		exam := 0.0
		if result.RawMarks != nil {
			if e, ok := result.RawMarks["exam"].(float64); ok {
				exam = e
			}
		}
		
		// Recalculate grade using standard NCDC grader
		gradeResult := grader.ComputeGrade(aoiCA, exam, 20, 80)
		
		if result.RawMarks == nil {
			result.RawMarks = make(models.JSONB)
		}
		result.RawMarks["ca"] = aoiCA
		result.RawMarks["total"] = aoiCA + exam
		result.FinalGrade = gradeResult.FinalGrade
		result.ComputationReason = gradeResult.ComputationReason
		result.RuleVersionHash = gradeResult.RuleVersionHash
		
		if err := s.db.Save(&result).Error; err != nil {
			return err
		}
	}
	
	return nil
}

// getAOIMarks fetches and calculates AOI marks for S1-S4 students
func (s *GradeCalculationService) getAOIMarks(studentID, subjectID uuid.UUID, term string, year int) float64 {
	var aoiActivity models.IntegrationActivity
	if err := s.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ?",
		studentID, subjectID, term, year).First(&aoiActivity).Error; err != nil {
		return 0.0 // No AOI marks found
	}
	
	return s.calculateAOICA(aoiActivity.Marks)
}

// calculateAOICA calculates AOI CA out of 20 from activity marks
func (s *GradeCalculationService) calculateAOICA(aoiMarks models.JSONB) float64 {
	if aoiMarks == nil {
		return 0.0
	}
	
	activities := []float64{}
	for i := 1; i <= 5; i++ {
		key := fmt.Sprintf("activity%d", i)
		if val, ok := aoiMarks[key].(float64); ok {
			activities = append(activities, val)
		}
	}
	
	if len(activities) == 0 {
		return 0.0
	}
	
	// Calculate average
	sum := 0.0
	for _, v := range activities {
		sum += v
	}
	avg := sum / float64(len(activities))
	
	// Convert to CA out of 20 (activities are out of 3) and round to nearest whole number
	return math.Round((avg / 3.0) * 20.0)
}

// RecalculateStudentGrade recalculates grade for a student's subject after all papers are imported
func (s *GradeCalculationService) RecalculateStudentGrade(
	studentID, subjectID uuid.UUID,
	term string,
	year int,
	level string,
) error {
	// Only for S5/S6
	if level != "S5" && level != "S6" {
		return nil
	}

	// Get all papers for this student/subject/term/year
	var allPapers []models.SubjectResult
	s.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND deleted_at IS NULL",
		studentID, subjectID, term, year).Find(&allPapers)

	if len(allPapers) == 0 {
		return nil
	}

	// Check if subsidiary
	var standardSubject models.StandardSubject
	isSubsidiary := false
	if err := s.db.First(&standardSubject, subjectID).Error; err == nil {
		isSubsidiary = standardSubject.Papers == 1
	}

	// Subsidiary subjects don't aggregate - skip
	if isSubsidiary {
		return nil
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

	// Need at least 2 papers to compute final grade
	if len(paperMarks) < 2 {
		return nil
	}

	// Compute final grade using standard UACE grader
	grader := &grading.UACEGrader{}
	gradeResult := grader.ComputeGradeFromPapers(paperMarks)

	// Update all paper records with the final grade
	for i := range allPapers {
		allPapers[i].FinalGrade = gradeResult.FinalGrade
		allPapers[i].ComputationReason = gradeResult.ComputationReason
		allPapers[i].RuleVersionHash = gradeResult.RuleVersionHash
		if err := s.db.Save(&allPapers[i]).Error; err != nil {
			return err
		}
	}

	return nil
}

// mapCodeToLetterGrade converts UNEB code to letter grade
func (s *GradeCalculationService) mapCodeToLetterGrade(code int) string {
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

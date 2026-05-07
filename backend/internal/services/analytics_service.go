package services

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/grading"
)

type AnalyticsService struct {
	db *gorm.DB
}

// paperGroup holds paper scores and metadata for Advanced Level subjects
type paperGroup struct {
	papers      []float64
	finalGrade  string
	studentName string
}

func NewAnalyticsService(db *gorm.DB) *AnalyticsService {
	return &AnalyticsService{db: db}
}

// Helper to build full student name (FirstName + MiddleName + LastName)
func buildFullStudentName(student *models.Student) string {
	if student == nil {
		return ""
	}
	if student.MiddleName != "" {
		return fmt.Sprintf("%s %s %s", student.FirstName, student.MiddleName, student.LastName)
	}
	return fmt.Sprintf("%s %s", student.FirstName, student.LastName)
}

// Helper to extract total marks from raw_marks JSON
func extractTotalMarks(rawMarks models.JSONB) float64 {
	// First check for total field (complete result)
	if total, ok := rawMarks["total"].(float64); ok {
		return total
	}
	
	// If no total, calculate from ca + exam if both exist
	ca, hasCA := rawMarks["ca"].(float64)
	exam, hasExam := rawMarks["exam"].(float64)
	
	if hasCA && hasExam {
		// Both CA and exam exist, calculate total
		return ca + exam
	}
	
	// If only exam exists (incomplete result), return exam as-is
	if hasExam {
		return exam
	}
	
	// If only CA exists (incomplete result), return CA as-is
	if hasCA {
		return ca
	}
	
	// No marks at all
	return 0.0
}

// Helper to extract marks for a specific level (handles Nursery averaging)
func extractMarksForLevel(rawMarks models.JSONB, level string) float64 {
	// Check if Nursery level
	isNursery := level == "Baby" || level == "Middle" || level == "Top"
	
	if isNursery {
		// For Nursery: Average of CA and Exam
		ca, hasCA := rawMarks["ca"].(float64)
		exam, hasExam := rawMarks["exam"].(float64)
		
		if hasCA && hasExam {
			return (ca + exam) / 2.0
		} else if hasExam {
			return exam
		} else if hasCA {
			return ca
		}
		return 0.0
	}
	
	// For all other levels, use standard extraction
	return extractTotalMarks(rawMarks)
}

func (s *AnalyticsService) GetStudentPerformanceAnalytics(schoolID, studentID uuid.UUID, filters AnalyticsFilters) (*StudentPerformanceAnalytics, error) {
	// Get student info
	var student models.Student
	if err := s.db.Where("school_id = ? AND id = ?", schoolID, studentID).First(&student).Error; err != nil {
		return nil, err
	}

	// Get current enrollment
	var enrollment models.Enrollment
	s.db.Where("student_id = ? AND year = ? AND term = ?", studentID, filters.Year, filters.Term).First(&enrollment)

	// Get class info
	var class models.Class
	if enrollment.ClassID != uuid.Nil {
		s.db.First(&class, enrollment.ClassID)
	}

	// Get student results
	var results []models.SubjectResult
	query := s.db.Where("school_id = ? AND student_id = ?", schoolID, studentID)
	if filters.Year > 0 {
		query = query.Where("year = ?", filters.Year)
	}
	if filters.Term != "" {
		query = query.Where("term = ?", filters.Term)
	}
	query.Preload("StandardSubject").Find(&results)

	// Get all class results for comparison
	var classResults []models.SubjectResult
	if enrollment.ClassID != uuid.Nil {
		classQuery := s.db.Where("school_id = ? AND class_id = ?", schoolID, enrollment.ClassID)
		if filters.Year > 0 {
			classQuery = classQuery.Where("year = ?", filters.Year)
		}
		if filters.Term != "" {
			classQuery = classQuery.Where("term = ?", filters.Term)
		}
		classQuery.Preload("StandardSubject").Find(&classResults)
	}

	// Get attendance
	var attendance []models.Attendance
	attQuery := s.db.Where("school_id = ? AND student_id = ?", schoolID, studentID)
	if filters.Year > 0 {
		attQuery = attQuery.Where("year = ?", filters.Year)
	}
	if filters.Term != "" {
		attQuery = attQuery.Where("term = ?", filters.Term)
	}
	attQuery.Find(&attendance)

	// Build analytics
	analytics := &StudentPerformanceAnalytics{
		Student:              s.buildStudentContext(&student, &class, filters),
		ExecutiveSummary:     s.buildExecutiveSummary(results, classResults, studentID),
		PerformanceTrend:     s.buildPerformanceTrend(schoolID, studentID, filters),
		SubjectBreakdown:     s.buildSubjectBreakdown(results, classResults, studentID),
		StrengthsWeaknesses:  s.buildStrengthsWeaknesses(results),
		ComparativeAnalytics: s.buildComparativeAnalytics(results, classResults),
		ConsistencyMetrics:   s.buildConsistencyMetrics(results),
		AttendanceEngagement: s.buildAttendanceEngagement(attendance, results),
		RiskAnalysis:         s.buildRiskAnalysis(results, attendance),
		ActionableInsights:   s.generateActionableInsights(results, attendance),
		AssessmentBreakdown:  s.buildAssessmentBreakdown(schoolID, studentID, filters),
		TeacherRemarks:       []TeacherRemark{},
		Alerts:               s.buildAlerts(results, attendance),
	}

	return analytics, nil
}

func (s *AnalyticsService) GetGradePerformanceAnalytics(schoolID uuid.UUID, filters AnalyticsFilters) (*GradePerformanceAnalytics, error) {
	if filters.ClassID == nil {
		return nil, fmt.Errorf("class_id is required")
	}

	var class models.Class
	if err := s.db.First(&class, *filters.ClassID).Error; err != nil {
		return nil, err
	}

	// Fetch subject results for the class
	var results []models.SubjectResult
	query := s.db.Where("class_id = ? AND deleted_at IS NULL", *filters.ClassID)
	
	if filters.Year > 0 {
		query = query.Where("year = ?", filters.Year)
	}
	if filters.Term != "" {
		query = query.Where("term = ?", filters.Term)
	}
	if filters.ExamType != "" {
		query = query.Where("exam_type = ?", filters.ExamType)
	}
	
	query.Preload("StandardSubject").Preload("Student").Find(&results)

	if len(results) == 0 {
		// Return empty analytics
		return &GradePerformanceAnalytics{
			GradeContext: GradeContext{
				ClassName:     class.Name,
				Level:         class.Level,
				Stream:        class.Stream,
				Year:          filters.Year,
				Term:          filters.Term,
				TotalStudents: 0,
			},
			SubjectOverview:       []SubjectOverview{},
			GradeDistribution:     make(map[string]GradeDistData),
			SubjectRanking:        []SubjectRanking{},
			SubjectTrends:         []SubjectTrend{},
			DifficultyIndex:       []DifficultyMetric{},
			TopPerformers:         make(map[string][]TopStudent),
			BottomPerformers:      make(map[string][]TopStudent),
			ConsistencyPerSubject: []SubjectConsistency{},
			CrossGradeComparison:  []CrossGradeData{},
			GradeInsights:         []string{},
		}, nil
	}

	// For O-Level (S1-S4), fetch AOI marks and merge with exam marks
	isOLevel := class.Level == "S1" || class.Level == "S2" || class.Level == "S3" || class.Level == "S4"
	isAdvancedLevel := class.Level == "S5" || class.Level == "S6"
	aoiMarks := make(map[string]float64) // key: studentID-subjectID
	
	if isOLevel {
		var aoiActivities []models.IntegrationActivity
		aoiQuery := s.db.Where("school_id = ?", schoolID)
		if filters.Year > 0 {
			aoiQuery = aoiQuery.Where("year = ?", filters.Year)
		}
		if filters.Term != "" {
			aoiQuery = aoiQuery.Where("term = ?", filters.Term)
		}
		aoiQuery.Find(&aoiActivities)
		
		// Calculate AOI CA marks (out of 20)
		for _, aoi := range aoiActivities {
			if aoi.Marks != nil {
				activities := []float64{}
				for i := 1; i <= 5; i++ {
					if val, ok := aoi.Marks[fmt.Sprintf("activity%d", i)].(float64); ok {
						activities = append(activities, val)
					}
				}
				if len(activities) > 0 {
					avg := 0.0
					for _, v := range activities {
						avg += v
					}
					avg = avg / float64(len(activities))
					// Convert to CA out of 20: (avg / 3) * 20
					ca := math.Round((avg / 3.0) * 20.0)
					key := fmt.Sprintf("%s-%s", aoi.StudentID, aoi.SubjectID)
					aoiMarks[key] = ca
				}
			}
		}
	}

	studentCount := make(map[uuid.UUID]bool)
	for _, r := range results {
		studentCount[r.StudentID] = true
	}

	// For Advanced Level, group papers by student-subject
	advancedLevelData := make(map[string]*paperGroup) // key: studentID-subjectID
	
	if isAdvancedLevel {
		for _, r := range results {
			if r.StandardSubject == nil || r.Student == nil {
				continue
			}
			key := fmt.Sprintf("%s-%s", r.StudentID, r.SubjectID)
			
			if advancedLevelData[key] == nil {
				advancedLevelData[key] = &paperGroup{
					papers:      []float64{},
					finalGrade:  r.FinalGrade,
					studentName: buildFullStudentName(r.Student),
				}
			}
			
			// Each row is a separate paper - extract the mark from raw_marks
			// Handle both {"mark":X,"paper":Y} and {"exam":X,"mark":X} formats
			var paperMark float64
			if mark, ok := r.RawMarks["mark"].(float64); ok && mark > 0 {
				paperMark = mark
			} else if exam, ok := r.RawMarks["exam"].(float64); ok && exam > 0 {
				paperMark = exam
			}
			
			if paperMark > 0 {
				advancedLevelData[key].papers = append(advancedLevelData[key].papers, paperMark)
			}
			
			// Update final grade if available (use the last one)
			if r.FinalGrade != "" {
				advancedLevelData[key].finalGrade = r.FinalGrade
			}
		}
	}

	// Build subject overview
	subjectData := make(map[uuid.UUID][]float64)
	subjectNames := make(map[uuid.UUID]string)
	subjectGrades := make(map[uuid.UUID]map[string]int)
	studentSubjectScores := make(map[uuid.UUID]map[uuid.UUID]float64)
	
	if isAdvancedLevel {
		// For Advanced Level, process grouped paper data
		for key, group := range advancedLevelData {
			if len(group.papers) == 0 {
				continue
			}
			
			// Parse key to get studentID and subjectID
			parts := strings.Split(key, "-")
			if len(parts) < 10 { // UUID has 5 parts, so studentID-subjectID has at least 10
				continue
			}
			// Reconstruct UUIDs (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
			studentIDStr := strings.Join(parts[0:5], "-")
			subjectIDStr := strings.Join(parts[5:10], "-")
			studentID, err := uuid.Parse(studentIDStr)
			if err != nil {
				continue
			}
			subjectID, err := uuid.Parse(subjectIDStr)
			if err != nil {
				continue
			}
			
			// Find subject name from results
			var subjectName string
			for _, r := range results {
				if r.SubjectID == subjectID && r.StandardSubject != nil {
					subjectName = r.StandardSubject.Name
					subjectNames[subjectID] = subjectName
					break
				}
			}
			
			if subjectName == "" {
				continue // Skip if subject name not found
			}
			
			// Calculate average of papers for ranking/statistics
			sum := 0.0
			for _, p := range group.papers {
				sum += p
			}
			avgScore := sum / float64(len(group.papers))
			
			subjectData[subjectID] = append(subjectData[subjectID], avgScore)
			
			// Store student-subject scores
			if studentSubjectScores[studentID] == nil {
				studentSubjectScores[studentID] = make(map[uuid.UUID]float64)
			}
			studentSubjectScores[studentID][subjectID] = avgScore
			
			// Track grade distribution using stored final grade
			if subjectGrades[subjectID] == nil {
				subjectGrades[subjectID] = make(map[string]int)
			}
			if group.finalGrade != "" {
				subjectGrades[subjectID][group.finalGrade]++
			} else {
				// Calculate grade using UACE logic if not stored
				grader := &grading.UACEGrader{}
				gradeResult := grader.ComputeGradeFromPapers(group.papers)
				subjectGrades[subjectID][gradeResult.FinalGrade]++
			}
		}
	} else {
		// For other levels (Primary, O-Level, Nursery)
		for _, r := range results {
			if r.StandardSubject == nil {
				continue
			}
			
			// Calculate total score
			var score float64
			if isOLevel {
				// For O-Level: Get exam from raw_marks + CA from AOI
				exam := 0.0
				if e, ok := r.RawMarks["exam"].(float64); ok {
					exam = e
				}
				// Get CA from AOI marks
				key := fmt.Sprintf("%s-%s", r.StudentID, r.SubjectID)
				ca := aoiMarks[key]
				score = ca + exam
			} else {
				// For other levels (Primary, Nursery), use level-specific extraction
				score = extractMarksForLevel(r.RawMarks, class.Level)
			}
			
			subjectData[r.SubjectID] = append(subjectData[r.SubjectID], score)
			subjectNames[r.SubjectID] = r.StandardSubject.Name
			
			// Store student-subject scores for top performers
			if studentSubjectScores[r.StudentID] == nil {
				studentSubjectScores[r.StudentID] = make(map[uuid.UUID]float64)
			}
			studentSubjectScores[r.StudentID][r.SubjectID] = score
			
			// Track grade distribution
			if subjectGrades[r.SubjectID] == nil {
				subjectGrades[r.SubjectID] = make(map[string]int)
			}
			// Always calculate grade based on class level, ignore stored grade
			grade := calculateGradeForLevel(score, class.Level)
			subjectGrades[r.SubjectID][grade]++
		}
	}
	
	// Calculate subject overview
	subjectOverview := []SubjectOverview{}
	
	// Fetch previous exam data for comparison
	previousSubjectAverages := s.getPreviousExamAverages(schoolID, *filters.ClassID, filters.Year, filters.Term, filters.ExamType)
	
	for subjID, scores := range subjectData {
		if len(scores) == 0 {
			continue
		}
		
		sum := 0.0
		min := scores[0]
		max := scores[0]
		passCount := 0
		
		for _, s := range scores {
			sum += s
			if s < min {
				min = s
			}
			if s > max {
				max = s
			}
			if s >= 50 {
				passCount++
			}
		}
		
		avg := sum / float64(len(scores))
		passRate := float64(passCount) / float64(len(scores)) * 100
		
		// Get previous average if available
		var prevAvg *float64
		var avgChange *float64
		if prevAverage, exists := previousSubjectAverages[subjID]; exists {
			prevAvg = &prevAverage
			change := avg - prevAverage
			avgChange = &change
		}
		
		subjectOverview = append(subjectOverview, SubjectOverview{
			SubjectID:       subjID,
			SubjectName:     subjectNames[subjID],
			AverageScore:    avg,
			PreviousAverage: prevAvg,
			AverageChange:   avgChange,
			HighestScore:    max,
			LowestScore:     min,
			PassRate:        passRate,
			StudentCount:    len(scores),
		})
	}
	
	// Build grade distribution
	gradeDistribution := make(map[string]GradeDistData)
	isPrimary := class.Level == "P1" || class.Level == "P2" || class.Level == "P3" || class.Level == "P4" || class.Level == "P5" || class.Level == "P6" || class.Level == "P7"
	isNursery := class.Level == "Baby" || class.Level == "Middle" || class.Level == "Top"
	
	for subjID, grades := range subjectGrades {
		subjectName := subjectNames[subjID]
		if subjectName == "" {
			continue // Skip subjects without names
		}
		
		if isAdvancedLevel {
			// For Advanced Level: A, B, C, D, E, O, F
			gradeDistribution[subjectName] = GradeDistData{
				A: grades["A"],
				B: grades["B"],
				C: grades["C"],
				D: grades["D"],
				E: grades["E"],
				O: grades["O"],
				F: grades["F"],
			}
		} else if isPrimary {
			// For Primary: D1, D2, C3, C4, C5, C6, P7, P8, F9
			gradeDistribution[subjectName] = GradeDistData{
				D1: grades["D1"],
				D2: grades["D2"],
				C3: grades["C3"],
				C4: grades["C4"],
				C5: grades["C5"],
				C6: grades["C6"],
				P7: grades["P7"],
				P8: grades["P8"],
				F9: grades["F9"],
			}
		} else if isNursery {
			// For Nursery: Mastering, Secure, Developing, Emerging, Not Yet
			gradeDistribution[subjectName] = GradeDistData{
				Mastering:  grades["Mastering"],
				Secure:     grades["Secure"],
				Developing: grades["Developing"],
				Emerging:   grades["Emerging"],
				NotYet:     grades["Not Yet"],
			}
		} else {
			// For O-Level: A, B, C, D, E
			gradeDistribution[subjectName] = GradeDistData{
				A: grades["A"],
				B: grades["B"],
				C: grades["C"],
				D: grades["D"],
				E: grades["E"],
			}
		}
	}
	
	// Build subject ranking
	subjectRanking := []SubjectRanking{}
	for _, overview := range subjectOverview {
		if overview.SubjectName == "" {
			continue // Skip subjects without names
		}
		subjectRanking = append(subjectRanking, SubjectRanking{
			SubjectName:     overview.SubjectName,
			AverageScore:    overview.AverageScore,
			PreviousAverage: overview.PreviousAverage,
			AverageChange:   overview.AverageChange,
			PassRate:        overview.PassRate,
		})
	}
	// Sort by average score
	sort.Slice(subjectRanking, func(i, j int) bool {
		return subjectRanking[i].AverageScore > subjectRanking[j].AverageScore
	})
	
	// Get previous rankings for comparison
	previousRankings := s.getPreviousExamRankings(schoolID, *filters.ClassID, filters.Year, filters.Term, filters.ExamType)
	
	// Assign ranks and calculate rank changes
	for i := range subjectRanking {
		subjectRanking[i].Rank = i + 1
		
		// Check if subject had a previous rank
		if prevRank, exists := previousRankings[subjectRanking[i].SubjectName]; exists {
			subjectRanking[i].PreviousRank = &prevRank
			rankChange := prevRank - subjectRanking[i].Rank // Positive = improved (moved up)
			subjectRanking[i].RankChange = &rankChange
		}
	}
	
	// Build difficulty index
	difficultyIndex := []DifficultyMetric{}
	for _, overview := range subjectOverview {
		failRate := 100 - overview.PassRate
		difficulty := "Easy"
		if failRate > 50 {
			difficulty = "Very Difficult"
		} else if failRate > 30 {
			difficulty = "Difficult"
		} else if failRate > 15 {
			difficulty = "Moderate"
		}
		
		difficultyIndex = append(difficultyIndex, DifficultyMetric{
			SubjectName: overview.SubjectName,
			FailRate:    failRate,
			AvgScore:    overview.AverageScore,
			Difficulty:  difficulty,
		})
	}
	
	// Build top performers (NOT for Advanced Level - they use advanced_subject_analysis instead)
	topPerformers := make(map[string][]TopStudent)
	
	if !isAdvancedLevel {
		// For other levels
		for subjID := range subjectData {
			type studentScore struct {
				studentID   uuid.UUID
				studentName string
				score       float64
				grade       string
			}
			
			studentScores := []studentScore{}
			for _, r := range results {
				if r.SubjectID == subjID && r.Student != nil {
					// Calculate total score
					var score float64
					if isOLevel {
						// For O-Level: Get exam from raw_marks + CA from AOI
						exam := 0.0
						if e, ok := r.RawMarks["exam"].(float64); ok {
							exam = e
						}
						// Get CA from AOI marks
						key := fmt.Sprintf("%s-%s", r.StudentID, r.SubjectID)
						ca := aoiMarks[key]
						score = ca + exam
					} else {
						score = extractMarksForLevel(r.RawMarks, class.Level)
					}
					
					// Always calculate grade based on class level, ignore stored grade
					grade := calculateGradeForLevel(score, class.Level)
					studentScores = append(studentScores, studentScore{
						studentID:   r.StudentID,
						studentName: buildFullStudentName(r.Student),
						score:       score,
						grade:       grade,
					})
				}
			}
			
			// Sort by score
			sort.Slice(studentScores, func(i, j int) bool {
				return studentScores[i].score > studentScores[j].score
			})
			
			// Get top 3
			top := []TopStudent{}
			for i := 0; i < len(studentScores) && i < 3; i++ {
				top = append(top, TopStudent{
					StudentID:   studentScores[i].studentID,
					StudentName: studentScores[i].studentName,
					Score:       studentScores[i].score,
					Grade:       studentScores[i].grade,
				})
			}
			
			topPerformers[subjectNames[subjID]] = top
		}
	}
	
	// Generate insights
	insights := []string{}
	if len(subjectRanking) > 0 {
		best := subjectRanking[0]
		worst := subjectRanking[len(subjectRanking)-1]
		insights = append(insights, fmt.Sprintf("Best performing subject: %s (%.1f%% average)", best.SubjectName, best.AverageScore))
		insights = append(insights, fmt.Sprintf("Needs improvement: %s (%.1f%% average)", worst.SubjectName, worst.AverageScore))
	}
	if len(studentCount) > 0 {
		insights = append(insights, fmt.Sprintf("Total students analyzed: %d", len(studentCount)))
	}

	// Build student details for Advanced Level
	var studentDetails []StudentDetail
	var advancedSubjectAnalysis []AdvancedSubjectAnalysis
	if isAdvancedLevel {
		studentDetails = s.buildAdvancedLevelStudentDetails(advancedLevelData, results, class.Level)
		advancedSubjectAnalysis = s.buildAdvancedLevelSubjectAnalysis(advancedLevelData, results, subjectNames)
		
		// For Advanced Level, populate subject_overview from advanced_subject_analysis
		subjectOverview = []SubjectOverview{}
		for _, analysis := range advancedSubjectAnalysis {
			// Calculate min/max from paper averages
			min := analysis.OverallAverage
			max := analysis.OverallAverage
			for _, avg := range analysis.PaperAverages {
				if avg < min {
					min = avg
				}
				if avg > max {
					max = avg
				}
			}
			
			// Get previous average if available
			var prevAvg *float64
			var avgChange *float64
			if prevAverage, exists := previousSubjectAverages[analysis.SubjectID]; exists {
				prevAvg = &prevAverage
				change := analysis.OverallAverage - prevAverage
				avgChange = &change
			}
			
			subjectOverview = append(subjectOverview, SubjectOverview{
				SubjectID:       analysis.SubjectID,
				SubjectName:     analysis.SubjectName,
				AverageScore:    analysis.OverallAverage,
				PreviousAverage: prevAvg,
				AverageChange:   avgChange,
				HighestScore:    max,
				LowestScore:     min,
				PassRate:        analysis.PassRate,
				StudentCount:    analysis.TotalStudents,
			})
		}
	}

	// Calculate grade summary (total count of each grade across all subjects)
	gradeSummary := make(map[string]int)
	if isAdvancedLevel {
		// For Advanced Level: A, B, C, D, E, O, F
		for _, grades := range subjectGrades {
			for grade, count := range grades {
				gradeSummary[grade] += count
			}
		}
	} else if isOLevel {
		// For O-Level: A, B, C, D, E
		for _, grades := range subjectGrades {
			for grade, count := range grades {
				gradeSummary[grade] += count
			}
		}
	} else {
		// For Primary: D1, D2, C3, C4, C5, C6, P7, P8, F9
		for _, grades := range subjectGrades {
			for grade, count := range grades {
				gradeSummary[grade] += count
			}
		}
	}

	analytics := &GradePerformanceAnalytics{
		GradeContext: GradeContext{
			ClassName:     class.Name,
			Level:         class.Level,
			Stream:        class.Stream,
			Year:          filters.Year,
			Term:          filters.Term,
			TotalStudents: len(studentCount),
			GradeSummary:  gradeSummary,
		},
		SubjectOverview:       subjectOverview,
		GradeDistribution:     gradeDistribution,
		SubjectRanking:        subjectRanking,
		SubjectTrends:         []SubjectTrend{},
		DifficultyIndex:       difficultyIndex,
		TopPerformers:         topPerformers,
		BottomPerformers:      make(map[string][]TopStudent),
		ConsistencyPerSubject: []SubjectConsistency{},
		CrossGradeComparison:  []CrossGradeData{},
		GradeInsights:         insights,
		StudentDetails:        studentDetails,
		AdvancedSubjectAnalysis: advancedSubjectAnalysis,
	}

	return analytics, nil
}



func (s *AnalyticsService) buildStudentContext(student *models.Student, class *models.Class, filters AnalyticsFilters) StudentContext {
	className := ""
	stream := ""
	if class != nil {
		className = class.Name
		stream = class.Stream
	}

	return StudentContext{
		ID:          student.ID,
		Name:        buildFullStudentName(student),
		PhotoURL:    student.PhotoURL,
		AdmissionNo: student.AdmissionNo,
		Class:       className,
		Stream:      stream,
		Year:        filters.Year,
		Term:        filters.Term,
	}
}

func (s *AnalyticsService) buildExecutiveSummary(results []models.SubjectResult, classResults []models.SubjectResult, studentID uuid.UUID) ExecutiveSummary {
	// Calculate student average
	var totalScore float64
	var count int
	for _, r := range results {
		score := extractTotalMarks(r.RawMarks)
		totalScore += score
		count++
	}
	avg := 0.0
	if count > 0 {
		avg = totalScore / float64(count)
	}

	// Calculate class average and rank
	studentScores := make(map[uuid.UUID]float64)
	for _, r := range classResults {
		score := extractTotalMarks(r.RawMarks)
		studentScores[r.StudentID] += score
	}

	// Convert to slice for ranking
	type studentScore struct {
		id    uuid.UUID
		score float64
	}
	scores := []studentScore{}
	for id, score := range studentScores {
		scores = append(scores, studentScore{id, score})
	}
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].score > scores[j].score
	})

	// Find rank
	rank := 1
	for i, s := range scores {
		if s.id == studentID {
			rank = i + 1
			break
		}
	}

	totalStudents := len(scores)
	percentile := 0.0
	if totalStudents > 0 {
		percentile = float64(totalStudents-rank) / float64(totalStudents) * 100
	}

	// Find strongest and weakest subjects
	strongest, weakest := "", ""
	maxScore, minScore := 0.0, 100.0
	for _, r := range results {
		score := extractTotalMarks(r.RawMarks)
		if score > maxScore && r.StandardSubject != nil {
			maxScore = score
			strongest = r.StandardSubject.Name
		}
		if score < minScore && r.StandardSubject != nil {
			minScore = score
			weakest = r.StandardSubject.Name
		}
	}

	trend := "stable"
	if avg >= 75 {
		trend = "improving steadily"
	} else if avg < 50 {
		trend = "declining"
	}

	insight := fmt.Sprintf("Performance %s; strongest in %s, weakest in %s.", trend, strongest, weakest)

	return ExecutiveSummary{
		OverallAverage:   avg,
		GPA:              avg / 25.0,
		ClassRank:        rank,
		TotalStudents:    totalStudents,
		Percentile:       percentile,
		PassStatus:       getPassStatus(avg),
		PerformanceLabel: getPerformanceLabel(avg),
		TrendIndicator:   trend,
		SummaryInsight:   insight,
		StrongestSubject: strongest,
		WeakestSubject:   weakest,
	}
}

func (s *AnalyticsService) buildPerformanceTrend(schoolID, studentID uuid.UUID, filters AnalyticsFilters) []TrendPoint {
	// Get historical results
	var results []models.SubjectResult
	query := s.db.Where("school_id = ? AND student_id = ?", schoolID, studentID)
	if filters.Year > 0 {
		query = query.Where("year = ?", filters.Year)
	}
	query.Order("year, term").Find(&results)

	// Group by term
	termScores := make(map[string][]float64)
	for _, r := range results {
		key := fmt.Sprintf("%d-%s", r.Year, r.Term)
		score := extractTotalMarks(r.RawMarks)
		termScores[key] = append(termScores[key], score)
	}

	// Calculate averages
	trends := []TrendPoint{}
	for period, scores := range termScores {
		if len(scores) == 0 {
			continue
		}
		sum := 0.0
		for _, s := range scores {
			sum += s
		}
		avg := sum / float64(len(scores))
		trends = append(trends, TrendPoint{
			Period:     period,
			Score:      avg,
			MovingAvg:  avg,
			Assessment: "Term Average",
		})
	}

	// Sort by period
	sort.Slice(trends, func(i, j int) bool {
		return trends[i].Period < trends[j].Period
	})

	// Mark best and worst
	if len(trends) > 0 {
		maxIdx, minIdx := 0, 0
		for i := range trends {
			if trends[i].Score > trends[maxIdx].Score {
				maxIdx = i
			}
			if trends[i].Score < trends[minIdx].Score {
				minIdx = i
			}
		}
		trends[maxIdx].IsBest = true
		trends[minIdx].IsWorst = true
	}

	return trends
}

func (s *AnalyticsService) buildSubjectBreakdown(results []models.SubjectResult, classResults []models.SubjectResult, studentID uuid.UUID) []SubjectPerformance {
	// Calculate class averages per subject
	subjectClassAvg := make(map[uuid.UUID][]float64)
	for _, r := range classResults {
		score := extractTotalMarks(r.RawMarks)
		subjectClassAvg[r.SubjectID] = append(subjectClassAvg[r.SubjectID], score)
	}

	classAvgs := make(map[uuid.UUID]float64)
	for subj, scores := range subjectClassAvg {
		sum := 0.0
		for _, s := range scores {
			sum += s
		}
		if len(scores) > 0 {
			classAvgs[subj] = sum / float64(len(scores))
		}
	}

	// Build breakdown
	breakdown := []SubjectPerformance{}
	for _, r := range results {
		if r.StandardSubject == nil {
			continue
		}
		score := extractTotalMarks(r.RawMarks)
		classAvg := classAvgs[r.SubjectID]

		// Calculate rank
		rank := 1
		for _, cr := range classResults {
			if cr.SubjectID == r.SubjectID {
				crScore := extractTotalMarks(cr.RawMarks)
				if crScore > score {
					rank++
				}
			}
		}

		trend := "stable"
		if score > classAvg {
			trend = "above average"
		} else if score < classAvg {
			trend = "below average"
		}

		breakdown = append(breakdown, SubjectPerformance{
			SubjectID:       r.SubjectID,
			SubjectName:     r.StandardSubject.Name,
			CurrentScore:    score,
			ClassAverage:    classAvg,
			Rank:            rank,
			Grade:           r.FinalGrade,
			WeightedContrib: score / 100.0,
			Trend:           trend,
		})
	}

	// Mark strongest and weakest
	if len(breakdown) > 0 {
		maxIdx, minIdx := 0, 0
		for i := range breakdown {
			if breakdown[i].CurrentScore > breakdown[maxIdx].CurrentScore {
				maxIdx = i
			}
			if breakdown[i].CurrentScore < breakdown[minIdx].CurrentScore {
				minIdx = i
			}
		}
		breakdown[maxIdx].IsStrongest = true
		breakdown[minIdx].IsWeakest = true
	}

	return breakdown
}

func (s *AnalyticsService) buildStrengthsWeaknesses(results []models.SubjectResult) StrengthsWeaknesses {
	strong := []SubjectCategory{}
	moderate := []SubjectCategory{}
	weak := []SubjectCategory{}
	heatmap := []HeatmapData{}

	for _, r := range results {
		if r.StandardSubject == nil {
			continue
		}
		score := extractTotalMarks(r.RawMarks)
		percentage := score

		cat := SubjectCategory{
			SubjectName: r.StandardSubject.Name,
			Score:       score,
			Percentage:  percentage,
		}

		level := "Weak"
		if score >= 75 {
			strong = append(strong, cat)
			level = "Strong"
		} else if score >= 50 {
			moderate = append(moderate, cat)
			level = "Moderate"
		} else {
			weak = append(weak, cat)
		}

		heatmap = append(heatmap, HeatmapData{
			Subject: r.StandardSubject.Name,
			Score:   score,
			Level:   level,
		})
	}

	return StrengthsWeaknesses{
		Strong:   strong,
		Moderate: moderate,
		Weak:     weak,
		Heatmap:  heatmap,
	}
}

func (s *AnalyticsService) buildComparativeAnalytics(results []models.SubjectResult, classResults []models.SubjectResult) ComparativeAnalytics {
	// Calculate student average
	studentTotal := 0.0
	for _, r := range results {
		studentTotal += extractTotalMarks(r.RawMarks)
	}

	// Calculate class average
	classTotal := 0.0
	for _, r := range classResults {
		classTotal += extractTotalMarks(r.RawMarks)
	}
	classAvg := 0.0
	if len(classResults) > 0 {
		classAvg = classTotal / float64(len(classResults))
	}

	// Find top performer
	topScore := 0.0
	for _, r := range classResults {
		score := extractTotalMarks(r.RawMarks)
		if score > topScore {
			topScore = score
		}
	}

	// Count subjects above average
	aboveAvg := 0
	for _, r := range results {
		score := extractTotalMarks(r.RawMarks)
		if score > classAvg {
			aboveAvg++
		}
	}

	insight := fmt.Sprintf("Above class average in %d out of %d subjects", aboveAvg, len(results))

	return ComparativeAnalytics{
		ClassAverage:      classAvg,
		TopPerformer:      topScore,
		SchoolAverage:     classAvg,
		PercentileRank:    0,
		AboveAverageCount: aboveAvg,
		TotalSubjects:     len(results),
		TopPercentages:    make(map[string]float64),
		ComparisonInsight: insight,
	}
}

func (s *AnalyticsService) buildConsistencyMetrics(results []models.SubjectResult) ConsistencyMetrics {
	scores := []float64{}
	for _, r := range results {
		scores = append(scores, extractTotalMarks(r.RawMarks))
	}

	if len(scores) == 0 {
		return ConsistencyMetrics{}
	}

	// Calculate mean
	mean := 0.0
	for _, s := range scores {
		mean += s
	}
	mean /= float64(len(scores))

	// Calculate variance
	variance := 0.0
	for _, s := range scores {
		variance += math.Pow(s-mean, 2)
	}
	variance /= float64(len(scores))

	stdDev := math.Sqrt(variance)

	// Calculate gap
	sort.Float64s(scores)
	gap := scores[len(scores)-1] - scores[0]

	// Stability score
	stability := 100.0
	if mean > 0 {
		stability = 100 - (stdDev/mean)*100
	}

	label := "Highly consistent"
	if stdDev > 15 {
		label = "Unstable performance"
	} else if stdDev > 10 {
		label = "Moderately consistent"
	}

	return ConsistencyMetrics{
		ScoreVariance:     variance,
		StandardDeviation: stdDev,
		BestWorstGap:      gap,
		ConsistencyLabel:  label,
		StabilityScore:    stability,
	}
}

func (s *AnalyticsService) buildAttendanceEngagement(attendance []models.Attendance, results []models.SubjectResult) AttendanceEngagement {
	if len(attendance) == 0 {
		return AttendanceEngagement{}
	}

	present := 0
	absent := 0
	for _, a := range attendance {
		if a.Status == "present" {
			present++
		} else if a.Status == "absent" {
			absent++
		}
	}

	totalDays := len(attendance)
	attRate := 0.0
	if totalDays > 0 {
		attRate = float64(present) / float64(totalDays) * 100
	}

	// Calculate average score
	avgScore := 0.0
	if len(results) > 0 {
		total := 0.0
		for _, r := range results {
			total += extractTotalMarks(r.RawMarks)
		}
		avgScore = total / float64(len(results))
	}

	insight := ""
	if attRate < 80 && avgScore < 60 {
		insight = "Performance drops when attendance is below 80%"
	} else if attRate >= 90 {
		insight = "Excellent attendance correlates with good performance"
	}

	return AttendanceEngagement{
		AttendanceRate:       attRate,
		AssignmentCompletion: 0,
		LateSubmissions:      0,
		CorrelationInsight:   insight,
		TotalDays:            totalDays,
		PresentDays:          present,
		AbsentDays:           absent,
	}
}

func (s *AnalyticsService) buildRiskAnalysis(results []models.SubjectResult, attendance []models.Attendance) RiskAnalysis {
	// Calculate average
	total := 0.0
	for _, r := range results {
		total += extractTotalMarks(r.RawMarks)
	}
	avg := 0.0
	if len(results) > 0 {
		avg = total / float64(len(results))
	}

	// Determine risk level
	riskLevel := "Low"
	riskFactors := []string{}
	recommendations := []string{}

	if avg < 50 {
		riskLevel = "High"
		riskFactors = append(riskFactors, "Overall average below passing grade")
		recommendations = append(recommendations, "Immediate intervention required")
	} else if avg < 65 {
		riskLevel = "Medium"
		riskFactors = append(riskFactors, "Performance below expected level")
		recommendations = append(recommendations, "Additional support recommended")
	}

	// Check attendance
	if len(attendance) > 0 {
		present := 0
		for _, a := range attendance {
			if a.Status == "present" {
				present++
			}
		}
		attRate := float64(present) / float64(len(attendance)) * 100
		if attRate < 75 {
			riskFactors = append(riskFactors, "Low attendance rate")
			recommendations = append(recommendations, "Improve attendance")
		}
	}

	// Calculate failing probability per subject
	failingProb := make(map[string]float64)
	for _, r := range results {
		if r.StandardSubject == nil {
			continue
		}
		score := extractTotalMarks(r.RawMarks)
		if score < 50 {
			failingProb[r.StandardSubject.Name] = 100 - score
			riskFactors = append(riskFactors, fmt.Sprintf("Failing %s", r.StandardSubject.Name))
		}
	}

	return RiskAnalysis{
		RiskLevel:          riskLevel,
		FailingProbability: failingProb,
		ExpectedFinalGrade: avg,
		RiskFactors:        riskFactors,
		RecommendedActions: recommendations,
	}
}

func (s *AnalyticsService) generateActionableInsights(results []models.SubjectResult, attendance []models.Attendance) []string {
	insights := []string{}

	// Find weakest subject
	minScore := 100.0
	weakest := ""
	for _, r := range results {
		if r.StandardSubject == nil {
			continue
		}
		score := extractTotalMarks(r.RawMarks)
		if score < minScore {
			minScore = score
			weakest = r.StandardSubject.Name
		}
	}
	if weakest != "" && minScore < 60 {
		insights = append(insights, fmt.Sprintf("Focus on %s: lowest scoring subject (%.1f%%)", weakest, minScore))
	}

	// Calculate overall trend
	total := 0.0
	for _, r := range results {
		total += extractTotalMarks(r.RawMarks)
	}
	avg := 0.0
	if len(results) > 0 {
		avg = total / float64(len(results))
	}

	if avg >= 75 {
		insights = append(insights, fmt.Sprintf("Performance improving (%.1f%% average)", avg))
	} else if avg < 50 {
		insights = append(insights, "Urgent: Performance below passing grade")
	}

	// Attendance insight
	if len(attendance) > 0 {
		present := 0
		for _, a := range attendance {
			if a.Status == "present" {
				present++
			}
		}
		attRate := float64(present) / float64(len(attendance)) * 100
		if attRate < 80 {
			potentialGain := (80 - attRate) / 8 // Rough estimate
			insights = append(insights, fmt.Sprintf("Attendance improvement could increase average by ~%.0f%%", potentialGain))
		}
	}

	return insights
}

func (s *AnalyticsService) buildAssessmentBreakdown(schoolID, studentID uuid.UUID, filters AnalyticsFilters) []AssessmentDetail {
	var marks []models.Mark
	query := s.db.Preload("Assessment").Preload("Assessment.StandardSubject").
		Where("student_id = ?", studentID)
	
	if filters.Year > 0 || filters.Term != "" {
		query = query.Joins("JOIN assessments ON marks.assessment_id = assessments.id")
		if filters.Year > 0 {
			query = query.Where("assessments.year = ?", filters.Year)
		}
		if filters.Term != "" {
			query = query.Where("assessments.term = ?", filters.Term)
		}
	}
	
	query.Find(&marks)

	details := []AssessmentDetail{}
	for _, m := range marks {
		if m.Assessment == nil {
			continue
		}
		
		percentage := 0.0
		if m.Assessment.MaxMarks > 0 {
			percentage = (m.MarksObtained / float64(m.Assessment.MaxMarks)) * 100
		}
		
		subjectName := ""
		if m.Assessment.StandardSubject != nil {
			subjectName = m.Assessment.StandardSubject.Name
		}
		
		details = append(details, AssessmentDetail{
			AssessmentID:   m.AssessmentID,
			AssessmentType: m.Assessment.AssessmentType,
			SubjectName:    subjectName,
			Score:          m.MarksObtained,
			MaxMarks:       m.Assessment.MaxMarks,
			Percentage:     percentage,
			Weight:         1.0,
			Contribution:   percentage / 100.0,
			Date:           m.Assessment.Date,
			Grade:          m.Grade,
		})
	}

	return details
}

func (s *AnalyticsService) buildTeacherRemarks(marks interface{}) []TeacherRemark {
	return []TeacherRemark{}
}

func getPerformanceLabel(avg float64) string {
	if avg >= 80 {
		return "Excellent"
	} else if avg >= 65 {
		return "Good"
	}
	return "Needs Improvement"
}

func getPassStatus(avg float64) string {
	if avg >= 50 {
		return "Pass"
	}
	return "Fail"
}

func (s *AnalyticsService) buildAlerts(results []models.SubjectResult, attendance []models.Attendance) []Alert {
	alerts := []Alert{}

	// Check for failing subjects
	for _, r := range results {
		if r.StandardSubject == nil {
			continue
		}
		score := extractTotalMarks(r.RawMarks)
		if score < 50 {
			alerts = append(alerts, Alert{
				Type:     "performance_drop",
				Severity: "high",
				Message:  fmt.Sprintf("Failing %s (%.1f%%)", r.StandardSubject.Name, score),
				Date:     time.Now(),
			})
		}
	}

	// Check attendance
	if len(attendance) > 0 {
		present := 0
		for _, a := range attendance {
			if a.Status == "present" {
				present++
			}
		}
		attRate := float64(present) / float64(len(attendance)) * 100
		if attRate < 75 {
			alerts = append(alerts, Alert{
				Type:     "low_attendance",
				Severity: "medium",
				Message:  fmt.Sprintf("Low attendance: %.1f%%", attRate),
				Date:     time.Now(),
			})
		}
	}

	// Check overall performance
	total := 0.0
	for _, r := range results {
		total += extractTotalMarks(r.RawMarks)
	}
	if len(results) > 0 {
		avg := total / float64(len(results))
		if avg < 50 {
			alerts = append(alerts, Alert{
				Type:     "overall_performance",
				Severity: "critical",
				Message:  fmt.Sprintf("Overall average below passing: %.1f%%", avg),
				Date:     time.Now(),
			})
		}
	}

	return alerts
}

// calculateGradeForLevel calculates grade based on total score and class level
func calculateGradeForLevel(score float64, level string) string {
	grader := grading.GetGrader(level)
	if grader == nil {
		// Fallback to simple grading
		if score >= 80 {
			return "A"
		} else if score >= 65 {
			return "B"
		} else if score >= 50 {
			return "C"
		} else if score >= 35 {
			return "D"
		}
		return "E"
	}

	// Use the actual grading logic based on level
	switch g := grader.(type) {
	case *grading.NurseryGrader:
		// For nursery, score is already averaged
		result := g.ComputeGrade(score, score, 100, 100)
		return result.FinalGrade
	case *grading.PrimaryGrader:
		// For primary: Total is already CA+Exam combined
		// Use the grading thresholds directly on the total
		if score >= 90 {
			return "D1"
		} else if score >= 80 {
			return "D2"
		} else if score >= 70 {
			return "C3"
		} else if score >= 60 {
			return "C4"
		} else if score >= 55 {
			return "C5"
		} else if score >= 50 {
			return "C6"
		} else if score >= 45 {
			return "P7"
		} else if score >= 40 {
			return "P8"
		}
		return "F9"
	case *grading.NCDCGrader:
		// For O-Level: Total is already AOI+Exam combined
		// Use the grading thresholds directly on the total
		if score >= 80 {
			return "A"
		} else if score >= 65 {
			return "B"
		} else if score >= 50 {
			return "C"
		} else if score >= 35 {
			return "D"
		}
		return "E"
	case *grading.UACEGrader:
		// For UACE, use single paper grading
		result := g.ComputeGradeFromPapers([]float64{score, score})
		return result.FinalGrade
	default:
		// Fallback
		if score >= 80 {
			return "A"
		} else if score >= 65 {
			return "B"
		} else if score >= 50 {
			return "C"
		} else if score >= 35 {
			return "D"
		}
		return "E"
	}
}

// buildAdvancedLevelStudentDetails builds comprehensive student breakdown for Advanced Level
func (s *AnalyticsService) buildAdvancedLevelStudentDetails(advancedLevelData map[string]*paperGroup, results []models.SubjectResult, level string) []StudentDetail {
	// Group by student
	studentData := make(map[uuid.UUID]*StudentDetail)
	studentSubjects := make(map[uuid.UUID]map[uuid.UUID]*StudentSubjectDetail)
	
	for key, group := range advancedLevelData {
		if len(group.papers) == 0 {
			continue
		}
		
		// Parse key to get studentID and subjectID
		parts := strings.Split(key, "-")
		if len(parts) < 10 {
			continue
		}
		studentIDStr := strings.Join(parts[0:5], "-")
		subjectIDStr := strings.Join(parts[5:10], "-")
		studentID, err := uuid.Parse(studentIDStr)
		if err != nil {
			continue
		}
		subjectID, err := uuid.Parse(subjectIDStr)
		if err != nil {
			continue
		}
		
		// Find student and subject info from results
		var studentInfo *models.Student
		var subjectName string
		for _, r := range results {
			if r.StudentID == studentID && r.SubjectID == subjectID {
				studentInfo = r.Student
				if r.StandardSubject != nil {
					subjectName = r.StandardSubject.Name
				}
				break
			}
		}
		
		if studentInfo == nil {
			continue
		}
		
		// Initialize student detail if not exists
		if studentData[studentID] == nil {
			studentData[studentID] = &StudentDetail{
				StudentID:   studentID,
				StudentName: buildFullStudentName(studentInfo),
				AdmissionNo: studentInfo.AdmissionNo,
				Gender:      studentInfo.Gender,
				Subjects:    []StudentSubjectDetail{},
			}
			studentSubjects[studentID] = make(map[uuid.UUID]*StudentSubjectDetail)
		}
		
		// Calculate average and grade
		sum := 0.0
		for _, p := range group.papers {
			sum += p
		}
		avgScore := sum / float64(len(group.papers))
		
		grade := group.finalGrade
		if grade == "" {
			grader := &grading.UACEGrader{}
			gradeResult := grader.ComputeGradeFromPapers(group.papers)
			grade = gradeResult.FinalGrade
		}
		
		// Calculate points
		points := calculateALevelPointsFromGrade(grade)
		
		// Add subject detail
		subjectDetail := StudentSubjectDetail{
			SubjectID:   subjectID,
			SubjectName: subjectName,
			Papers:      group.papers,
			Total:       avgScore,
			Grade:       grade,
			Points:      points,
		}
		
		studentSubjects[studentID][subjectID] = &subjectDetail
	}
	
	// Calculate totals and build final list
	details := []StudentDetail{}
	for studentID, detail := range studentData {
		totalPoints := 0
		totalMarks := 0.0
		count := 0
		
		for _, subj := range studentSubjects[studentID] {
			detail.Subjects = append(detail.Subjects, *subj)
			totalPoints += subj.Points
			totalMarks += subj.Total
			count++
		}
		
		if count > 0 {
			detail.AverageMarks = totalMarks / float64(count)
			detail.TotalPoints = totalPoints
			detail.OverallGrade = calculateALevelGradeFromAvg(detail.AverageMarks)
			details = append(details, *detail)
		}
	}
	
	// Sort by total points (descending), then by average marks
	sort.Slice(details, func(i, j int) bool {
		if details[i].TotalPoints == details[j].TotalPoints {
			return details[i].AverageMarks > details[j].AverageMarks
		}
		return details[i].TotalPoints > details[j].TotalPoints
	})
	
	// Assign ranks
	for i := range details {
		details[i].Rank = i + 1
	}
	
	return details
}

// Helper function to calculate A-Level points from grade
func calculateALevelPointsFromGrade(grade string) int {
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

// Helper function to calculate A-Level grade from average
func calculateALevelGradeFromAvg(avg float64) string {
	if avg >= 75 {
		return "A"
	} else if avg >= 65 {
		return "B"
	} else if avg >= 55 {
		return "C"
	} else if avg >= 45 {
		return "D"
	} else if avg >= 35 {
		return "E"
	} else if avg >= 25 {
		return "O"
	}
	return "F"
}

// getPreviousExamAverages fetches average scores from the previous exam for comparison
func (s *AnalyticsService) getPreviousExamAverages(schoolID, classID uuid.UUID, year int, term, examType string) map[uuid.UUID]float64 {
	// Determine previous exam period
	prevYear, prevTerm, prevExamType := s.getPreviousPeriod(year, term, examType)
	
	// Get class info to determine level
	var class models.Class
	s.db.First(&class, classID)
	isOLevel := class.Level == "S1" || class.Level == "S2" || class.Level == "S3" || class.Level == "S4"
	isAdvancedLevel := class.Level == "S5" || class.Level == "S6"
	
	var prevResults []models.SubjectResult
	query := s.db.Where("class_id = ? AND deleted_at IS NULL AND year = ? AND term = ?", classID, prevYear, prevTerm)
	if prevExamType != "" {
		query = query.Where("exam_type = ?", prevExamType)
	}
	query.Preload("StandardSubject").Find(&prevResults)
	
	// If no results found and we were looking for MOT, fallback to BOT
	if len(prevResults) == 0 && prevExamType == "MOT" && examType == "EOT" {
		query = s.db.Where("class_id = ? AND deleted_at IS NULL AND year = ? AND term = ? AND exam_type = ?", classID, prevYear, prevTerm, "BOT")
		query.Preload("StandardSubject").Find(&prevResults)
	}
	
	// For O-Level, fetch AOI marks
	aoiMarks := make(map[string]float64)
	if isOLevel {
		var aoiActivities []models.IntegrationActivity
		aoiQuery := s.db.Where("school_id = ? AND year = ? AND term = ?", schoolID, prevYear, prevTerm)
		aoiQuery.Find(&aoiActivities)
		
		for _, aoi := range aoiActivities {
			if aoi.Marks != nil {
				activities := []float64{}
				for i := 1; i <= 5; i++ {
					if val, ok := aoi.Marks[fmt.Sprintf("activity%d", i)].(float64); ok {
						activities = append(activities, val)
					}
				}
				if len(activities) > 0 {
					avg := 0.0
					for _, v := range activities {
						avg += v
					}
					avg = avg / float64(len(activities))
					ca := math.Round((avg / 3.0) * 20.0)
					key := fmt.Sprintf("%s-%s", aoi.StudentID, aoi.SubjectID)
					aoiMarks[key] = ca
				}
			}
		}
	}
	
	// For Advanced Level, group papers by student-subject
	if isAdvancedLevel {
		advancedLevelData := make(map[string]*paperGroup)
		for _, r := range prevResults {
			if r.StandardSubject == nil {
				continue
			}
			key := fmt.Sprintf("%s-%s", r.StudentID, r.SubjectID)
			
			if advancedLevelData[key] == nil {
				advancedLevelData[key] = &paperGroup{papers: []float64{}}
			}
			
			var paperMark float64
			if mark, ok := r.RawMarks["mark"].(float64); ok && mark > 0 {
				paperMark = mark
			} else if exam, ok := r.RawMarks["exam"].(float64); ok && exam > 0 {
				paperMark = exam
			}
			
			if paperMark > 0 {
				advancedLevelData[key].papers = append(advancedLevelData[key].papers, paperMark)
			}
		}
		
		// Calculate averages per subject
		subjectScores := make(map[uuid.UUID][]float64)
		for key, group := range advancedLevelData {
			if len(group.papers) == 0 {
				continue
			}
			
			parts := strings.Split(key, "-")
			if len(parts) < 10 {
				continue
			}
			subjectIDStr := strings.Join(parts[5:10], "-")
			subjectID, err := uuid.Parse(subjectIDStr)
			if err != nil {
				continue
			}
			
			sum := 0.0
			for _, p := range group.papers {
				sum += p
			}
			avgScore := sum / float64(len(group.papers))
			subjectScores[subjectID] = append(subjectScores[subjectID], avgScore)
		}
		
		averages := make(map[uuid.UUID]float64)
		for subjID, scores := range subjectScores {
			if len(scores) > 0 {
				sum := 0.0
				for _, s := range scores {
					sum += s
				}
				averages[subjID] = sum / float64(len(scores))
			}
		}
		return averages
	}
	
	// For other levels (Primary, O-Level, Nursery)
	subjectScores := make(map[uuid.UUID][]float64)
	for _, r := range prevResults {
		if r.StandardSubject == nil {
			continue
		}
		
		var score float64
		if isOLevel {
			exam := 0.0
			if e, ok := r.RawMarks["exam"].(float64); ok {
				exam = e
			}
			key := fmt.Sprintf("%s-%s", r.StudentID, r.SubjectID)
			ca := aoiMarks[key]
			score = ca + exam
		} else {
			score = extractMarksForLevel(r.RawMarks, class.Level)
		}
		
		subjectScores[r.SubjectID] = append(subjectScores[r.SubjectID], score)
	}
	
	averages := make(map[uuid.UUID]float64)
	for subjID, scores := range subjectScores {
		if len(scores) > 0 {
			sum := 0.0
			for _, s := range scores {
				sum += s
			}
			averages[subjID] = sum / float64(len(scores))
		}
	}
	
	return averages
}

// getPreviousExamRankings fetches subject rankings from the previous exam
func (s *AnalyticsService) getPreviousExamRankings(schoolID, classID uuid.UUID, year int, term, examType string) map[string]int {
	// Determine previous exam period
	prevYear, prevTerm, prevExamType := s.getPreviousPeriod(year, term, examType)
	
	// Get class info to determine level
	var class models.Class
	s.db.First(&class, classID)
	isOLevel := class.Level == "S1" || class.Level == "S2" || class.Level == "S3" || class.Level == "S4"
	isAdvancedLevel := class.Level == "S5" || class.Level == "S6"
	
	var prevResults []models.SubjectResult
	query := s.db.Where("class_id = ? AND deleted_at IS NULL AND year = ? AND term = ?", classID, prevYear, prevTerm)
	if prevExamType != "" {
		query = query.Where("exam_type = ?", prevExamType)
	}
	query.Preload("StandardSubject").Find(&prevResults)
	
	// If no results found and we were looking for MOT, fallback to BOT
	if len(prevResults) == 0 && prevExamType == "MOT" && examType == "EOT" {
		query = s.db.Where("class_id = ? AND deleted_at IS NULL AND year = ? AND term = ? AND exam_type = ?", classID, prevYear, prevTerm, "BOT")
		query.Preload("StandardSubject").Find(&prevResults)
	}
	
	// For O-Level, fetch AOI marks
	aoiMarks := make(map[string]float64)
	if isOLevel {
		var aoiActivities []models.IntegrationActivity
		aoiQuery := s.db.Where("school_id = ? AND year = ? AND term = ?", schoolID, prevYear, prevTerm)
		aoiQuery.Find(&aoiActivities)
		
		for _, aoi := range aoiActivities {
			if aoi.Marks != nil {
				activities := []float64{}
				for i := 1; i <= 5; i++ {
					if val, ok := aoi.Marks[fmt.Sprintf("activity%d", i)].(float64); ok {
						activities = append(activities, val)
					}
				}
				if len(activities) > 0 {
					avg := 0.0
					for _, v := range activities {
						avg += v
					}
					avg = avg / float64(len(activities))
					ca := math.Round((avg / 3.0) * 20.0)
					key := fmt.Sprintf("%s-%s", aoi.StudentID, aoi.SubjectID)
					aoiMarks[key] = ca
				}
			}
		}
	}
	
	// Calculate averages per subject
	type subjectAvg struct {
		name string
		avg  float64
	}
	
	if isAdvancedLevel {
		// For Advanced Level, group papers
		advancedLevelData := make(map[string]*paperGroup)
		for _, r := range prevResults {
			if r.StandardSubject == nil {
				continue
			}
			key := fmt.Sprintf("%s-%s", r.StudentID, r.SubjectID)
			
			if advancedLevelData[key] == nil {
				advancedLevelData[key] = &paperGroup{papers: []float64{}}
			}
			
			var paperMark float64
			if mark, ok := r.RawMarks["mark"].(float64); ok && mark > 0 {
				paperMark = mark
			} else if exam, ok := r.RawMarks["exam"].(float64); ok && exam > 0 {
				paperMark = exam
			}
			
			if paperMark > 0 {
				advancedLevelData[key].papers = append(advancedLevelData[key].papers, paperMark)
			}
		}
		
		// Calculate averages per subject
		subjectScores := make(map[string][]float64)
		subjectNames := make(map[uuid.UUID]string)
		for key, group := range advancedLevelData {
			if len(group.papers) == 0 {
				continue
			}
			
			parts := strings.Split(key, "-")
			if len(parts) < 10 {
				continue
			}
			subjectIDStr := strings.Join(parts[5:10], "-")
			subjectID, err := uuid.Parse(subjectIDStr)
			if err != nil {
				continue
			}
			
			// Find subject name
			for _, r := range prevResults {
				if r.SubjectID == subjectID && r.StandardSubject != nil {
					subjectNames[subjectID] = r.StandardSubject.Name
					break
				}
			}
			
			sum := 0.0
			for _, p := range group.papers {
				sum += p
			}
			avgScore := sum / float64(len(group.papers))
			if name, ok := subjectNames[subjectID]; ok {
				subjectScores[name] = append(subjectScores[name], avgScore)
			}
		}
		
		averages := []subjectAvg{}
		for name, scores := range subjectScores {
			if len(scores) > 0 {
				sum := 0.0
				for _, s := range scores {
					sum += s
				}
				averages = append(averages, subjectAvg{name, sum / float64(len(scores))})
			}
		}
		
		// Sort by average
		sort.Slice(averages, func(i, j int) bool {
			return averages[i].avg > averages[j].avg
		})
		
		// Build ranking map
		rankings := make(map[string]int)
		for i, subj := range averages {
			rankings[subj.name] = i + 1
		}
		return rankings
	}
	
	// For other levels
	subjectScores := make(map[string][]float64)
	for _, r := range prevResults {
		if r.StandardSubject == nil {
			continue
		}
		
		var score float64
		if isOLevel {
			exam := 0.0
			if e, ok := r.RawMarks["exam"].(float64); ok {
				exam = e
			}
			key := fmt.Sprintf("%s-%s", r.StudentID, r.SubjectID)
			ca := aoiMarks[key]
			score = ca + exam
		} else {
			score = extractMarksForLevel(r.RawMarks, class.Level)
		}
		
		subjectScores[r.StandardSubject.Name] = append(subjectScores[r.StandardSubject.Name], score)
	}
	
	averages := []subjectAvg{}
	for name, scores := range subjectScores {
		if len(scores) > 0 {
			sum := 0.0
			for _, s := range scores {
				sum += s
			}
			averages = append(averages, subjectAvg{name, sum / float64(len(scores))})
		}
	}
	
	// Sort by average
	sort.Slice(averages, func(i, j int) bool {
		return averages[i].avg > averages[j].avg
	})
	
	// Build ranking map
	rankings := make(map[string]int)
	for i, subj := range averages {
		rankings[subj.name] = i + 1
	}
	
	return rankings
}

// getPreviousPeriod determines the previous exam period
func (s *AnalyticsService) getPreviousPeriod(year int, term string, examType string) (int, string, string) {
	// If exam type is specified, look for previous exam type in same term
	if examType != "" {
		switch examType {
		case "EOT":
			return year, term, "MOT"
		case "MOT":
			return year, term, "BOT"
		case "BOT":
			// BOT is first exam, look at previous term's EOT
			switch term {
			case "Term 1":
				return year - 1, "Term 3", "EOT"
			case "Term 2":
				return year, "Term 1", "EOT"
			case "Term 3":
				return year, "Term 2", "EOT"
			default:
				return year - 1, "Term 3", "EOT"
			}
		}
	}
	
	// If no exam type, look at previous term
	switch term {
	case "Term 1":
		return year - 1, "Term 3", ""
	case "Term 2":
		return year, "Term 1", ""
	case "Term 3":
		return year, "Term 2", ""
	default:
		return year - 1, "Term 3", ""
	}
}

// buildAdvancedLevelSubjectAnalysis builds comprehensive subject-by-subject analysis for Advanced Level
func (s *AnalyticsService) buildAdvancedLevelSubjectAnalysis(advancedLevelData map[string]*paperGroup, results []models.SubjectResult, subjectNames map[uuid.UUID]string) []AdvancedSubjectAnalysis {
	// Group data by subject
	subjectData := make(map[uuid.UUID]struct {
		paperScores    [][]float64 // All paper scores for all students
		grades         []string    // All grades
		studentCount   int
		isSubsidiary   bool
	})
	
	// Collect all data per subject
	for key, group := range advancedLevelData {
		if len(group.papers) == 0 {
			continue
		}
		
		parts := strings.Split(key, "-")
		if len(parts) < 10 {
			continue
		}
		_ = strings.Join(parts[0:5], "-") // studentID not needed here
		subjectIDStr := strings.Join(parts[5:10], "-")
		subjectID, err := uuid.Parse(subjectIDStr)
		if err != nil {
			continue
		}
		
		// Find subject info
		var isSubsidiary bool
		for _, r := range results {
			if r.SubjectID == subjectID && r.StandardSubject != nil {
				// Check if subsidiary (ICT, General Paper, Subsidiary ICT, etc.)
				subjectName := r.StandardSubject.Name
				isSubsidiary = contains([]string{"ICT", "General Paper", "Subsidiary ICT", "Subsidiary Mathematics", "Entrepreneurship"}, subjectName)
				break
			}
		}
		
		// Calculate grade if not stored
		grade := group.finalGrade
		if grade == "" {
			grader := &grading.UACEGrader{}
			gradeResult := grader.ComputeGradeFromPapers(group.papers)
			grade = gradeResult.FinalGrade
		}
		
		data := subjectData[subjectID]
		data.paperScores = append(data.paperScores, group.papers)
		data.grades = append(data.grades, grade)
		data.studentCount++
		data.isSubsidiary = isSubsidiary
		subjectData[subjectID] = data
	}
	
	// Build analysis for each subject
	analysis := []AdvancedSubjectAnalysis{}
	for subjectID, data := range subjectData {
		if data.studentCount == 0 {
			continue
		}
		
		// Get subject name - CRITICAL: Must have a name
		subjectName := subjectNames[subjectID]
		if subjectName == "" {
			// Try to find it from results again
			for _, r := range results {
				if r.SubjectID == subjectID && r.StandardSubject != nil {
					subjectName = r.StandardSubject.Name
					break
				}
			}
			if subjectName == "" {
				continue // Skip if still no name found
			}
		}
		
		// Calculate paper averages
		maxPapers := 0
		for _, papers := range data.paperScores {
			if len(papers) > maxPapers {
				maxPapers = len(papers)
			}
		}
		
		paperAverages := make([]float64, maxPapers)
		paperCounts := make([]int, maxPapers)
		
		for _, papers := range data.paperScores {
			for i, score := range papers {
				if i < maxPapers {
					paperAverages[i] += score
					paperCounts[i]++
				}
			}
		}
		
		for i := range paperAverages {
			if paperCounts[i] > 0 {
				paperAverages[i] /= float64(paperCounts[i])
			}
		}
		
		// Calculate overall average
		overallSum := 0.0
		for _, avg := range paperAverages {
			overallSum += avg
		}
		overallAverage := 0.0
		if len(paperAverages) > 0 {
			overallAverage = overallSum / float64(len(paperAverages))
		}
		
		// Count grade distribution
		gradeDistribution := make(map[string]int)
		for _, grade := range data.grades {
			gradeDistribution[grade]++
		}
		
		// Calculate pass/fail rates
		passRate := 0.0
		failRate := 0.0
		
		if data.isSubsidiary {
			// For subsidiary: O is pass, F is fail
			passCount := gradeDistribution["O"]
			failCount := gradeDistribution["F"]
			passRate = float64(passCount) / float64(data.studentCount) * 100
			failRate = float64(failCount) / float64(data.studentCount) * 100
		} else {
			// For principal subjects: A-E are pass, O and F are fail
			passCount := gradeDistribution["A"] + gradeDistribution["B"] + gradeDistribution["C"] + gradeDistribution["D"] + gradeDistribution["E"]
			failCount := gradeDistribution["O"] + gradeDistribution["F"]
			passRate = float64(passCount) / float64(data.studentCount) * 100
			failRate = float64(failCount) / float64(data.studentCount) * 100
		}
		
		rankingCriteria := "average"
		if data.isSubsidiary {
			rankingCriteria = "pass_rate"
		}
		
		analysis = append(analysis, AdvancedSubjectAnalysis{
			SubjectID:         subjectID,
			SubjectName:       subjectName, // Use the validated subject name
			IsSubsidiary:      data.isSubsidiary,
			TotalStudents:     data.studentCount,
			PaperAverages:     paperAverages,
			OverallAverage:    overallAverage,
			GradeDistribution: gradeDistribution,
			PassRate:          passRate,
			FailRate:          failRate,
			RankingCriteria:   rankingCriteria,
		})
	}
	
	// Sort and rank subjects
	// Separate principal and subsidiary subjects
	var principalSubjects []AdvancedSubjectAnalysis
	var subsidiarySubjects []AdvancedSubjectAnalysis
	
	for _, subj := range analysis {
		if subj.IsSubsidiary {
			subsidiarySubjects = append(subsidiarySubjects, subj)
		} else {
			principalSubjects = append(principalSubjects, subj)
		}
	}
	
	// Rank principal subjects by average (A is best, higher average = better)
	sort.Slice(principalSubjects, func(i, j int) bool {
		return principalSubjects[i].OverallAverage > principalSubjects[j].OverallAverage
	})
	
	// Rank subsidiary subjects by pass rate (O+F)
	sort.Slice(subsidiarySubjects, func(i, j int) bool {
		return subsidiarySubjects[i].PassRate > subsidiarySubjects[j].PassRate
	})
	
	// Assign ranks
	rank := 1
	for i := range principalSubjects {
		principalSubjects[i].Rank = rank
		rank++
	}
	
	for i := range subsidiarySubjects {
		subsidiarySubjects[i].Rank = rank
		rank++
	}
	
	// Combine back
	finalAnalysis := append(principalSubjects, subsidiarySubjects...)
	
	return finalAnalysis
}


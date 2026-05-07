package services

import (
	"time"

	"github.com/google/uuid"
)

// Analytics types to avoid import cycle

type AnalyticsFilters struct {
	Year      int
	Term      string
	ClassID   *uuid.UUID
	SubjectID *uuid.UUID
	ExamType  string
	StartDate *time.Time
	EndDate   *time.Time
}

type StudentPerformanceAnalytics struct {
	Student              StudentContext              `json:"student"`
	ExecutiveSummary     ExecutiveSummary            `json:"executive_summary"`
	PerformanceTrend     []TrendPoint                `json:"performance_trend"`
	SubjectBreakdown     []SubjectPerformance        `json:"subject_breakdown"`
	StrengthsWeaknesses  StrengthsWeaknesses         `json:"strengths_weaknesses"`
	ComparativeAnalytics ComparativeAnalytics        `json:"comparative_analytics"`
	ConsistencyMetrics   ConsistencyMetrics          `json:"consistency_metrics"`
	AttendanceEngagement AttendanceEngagement        `json:"attendance_engagement"`
	RiskAnalysis         RiskAnalysis                `json:"risk_analysis"`
	ActionableInsights   []string                    `json:"actionable_insights"`
	AssessmentBreakdown  []AssessmentDetail          `json:"assessment_breakdown"`
	TeacherRemarks       []TeacherRemark             `json:"teacher_remarks"`
	Alerts               []Alert                     `json:"alerts"`
}

type StudentContext struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	PhotoURL    string    `json:"photo_url"`
	AdmissionNo string    `json:"admission_no"`
	Class       string    `json:"class"`
	Stream      string    `json:"stream"`
	Year        int       `json:"year"`
	Term        string    `json:"term"`
}

type ExecutiveSummary struct {
	OverallAverage   float64 `json:"overall_average"`
	GPA              float64 `json:"gpa"`
	ClassRank        int     `json:"class_rank"`
	TotalStudents    int     `json:"total_students"`
	Percentile       float64 `json:"percentile"`
	PassStatus       string  `json:"pass_status"`
	PerformanceLabel string  `json:"performance_label"`
	TrendIndicator   string  `json:"trend_indicator"`
	SummaryInsight   string  `json:"summary_insight"`
	StrongestSubject string  `json:"strongest_subject"`
	WeakestSubject   string  `json:"weakest_subject"`
}

type TrendPoint struct {
	Period     string  `json:"period"`
	Score      float64 `json:"score"`
	MovingAvg  float64 `json:"moving_avg"`
	Assessment string  `json:"assessment"`
	IsBest     bool    `json:"is_best"`
	IsWorst    bool    `json:"is_worst"`
}

type SubjectPerformance struct {
	SubjectID       uuid.UUID `json:"subject_id"`
	SubjectName     string    `json:"subject_name"`
	CurrentScore    float64   `json:"current_score"`
	PreviousScore   *float64  `json:"previous_score"`
	ClassAverage    float64   `json:"class_average"`
	Rank            int       `json:"rank"`
	TotalStudents   int       `json:"total_students"`
	Grade           string    `json:"grade"`
	WeightedContrib float64   `json:"weighted_contribution"`
	Trend           string    `json:"trend"`
	IsStrongest     bool      `json:"is_strongest"`
	IsWeakest       bool      `json:"is_weakest"`
}

type StrengthsWeaknesses struct {
	Strong   []SubjectCategory `json:"strong"`
	Moderate []SubjectCategory `json:"moderate"`
	Weak     []SubjectCategory `json:"weak"`
	Heatmap  []HeatmapData     `json:"heatmap"`
}

type SubjectCategory struct {
	SubjectName string  `json:"subject_name"`
	Score       float64 `json:"score"`
	Percentage  float64 `json:"percentage"`
}

type HeatmapData struct {
	Subject string  `json:"subject"`
	Score   float64 `json:"score"`
	Level   string  `json:"level"`
}

type ComparativeAnalytics struct {
	ClassAverage      float64            `json:"class_average"`
	TopPerformer      float64            `json:"top_performer"`
	SchoolAverage     float64            `json:"school_average"`
	PercentileRank    float64            `json:"percentile_rank"`
	AboveAverageCount int                `json:"above_average_count"`
	TotalSubjects     int                `json:"total_subjects"`
	TopPercentages    map[string]float64 `json:"top_percentages"`
	ComparisonInsight string             `json:"comparison_insight"`
}

type ConsistencyMetrics struct {
	ScoreVariance     float64 `json:"score_variance"`
	StandardDeviation float64 `json:"standard_deviation"`
	BestWorstGap      float64 `json:"best_worst_gap"`
	ConsistencyLabel  string  `json:"consistency_label"`
	StabilityScore    float64 `json:"stability_score"`
}

type AttendanceEngagement struct {
	AttendanceRate       float64 `json:"attendance_rate"`
	AssignmentCompletion float64 `json:"assignment_completion"`
	LateSubmissions      int     `json:"late_submissions"`
	CorrelationInsight   string  `json:"correlation_insight"`
	TotalDays            int     `json:"total_days"`
	PresentDays          int     `json:"present_days"`
	AbsentDays           int     `json:"absent_days"`
}

type RiskAnalysis struct {
	RiskLevel          string             `json:"risk_level"`
	FailingProbability map[string]float64 `json:"failing_probability"`
	ExpectedFinalGrade float64            `json:"expected_final_grade"`
	RiskFactors        []string           `json:"risk_factors"`
	RecommendedActions []string           `json:"recommended_actions"`
}

type AssessmentDetail struct {
	AssessmentID   uuid.UUID `json:"assessment_id"`
	AssessmentType string    `json:"assessment_type"`
	SubjectName    string    `json:"subject_name"`
	Score          float64   `json:"score"`
	MaxMarks       int       `json:"max_marks"`
	Percentage     float64   `json:"percentage"`
	Weight         float64   `json:"weight"`
	Contribution   float64   `json:"contribution"`
	Date           time.Time `json:"date"`
	Grade          string    `json:"grade"`
}

type TeacherRemark struct {
	SubjectName string    `json:"subject_name"`
	Comment     string    `json:"comment"`
	Teacher     string    `json:"teacher"`
	Date        time.Time `json:"date"`
}

type Alert struct {
	Type     string    `json:"type"`
	Severity string    `json:"severity"`
	Message  string    `json:"message"`
	Date     time.Time `json:"date"`
}

type GradePerformanceAnalytics struct {
	GradeContext          GradeContext              `json:"grade_context"`
	SubjectOverview       []SubjectOverview         `json:"subject_overview"`
	GradeDistribution     map[string]GradeDistData  `json:"grade_distribution"`
	SubjectRanking        []SubjectRanking          `json:"subject_ranking"`
	SubjectTrends         []SubjectTrend            `json:"subject_trends"`
	DifficultyIndex       []DifficultyMetric        `json:"difficulty_index"`
	TopPerformers         map[string][]TopStudent   `json:"top_performers"`
	BottomPerformers      map[string][]TopStudent   `json:"bottom_performers"`
	ConsistencyPerSubject []SubjectConsistency      `json:"consistency_per_subject"`
	CrossGradeComparison  []CrossGradeData          `json:"cross_grade_comparison"`
	GradeInsights         []string                  `json:"grade_insights"`
	StudentDetails        []StudentDetail           `json:"student_details,omitempty"`        // For Advanced Level detailed breakdown
	AdvancedSubjectAnalysis []AdvancedSubjectAnalysis `json:"advanced_subject_analysis,omitempty"` // For Advanced Level subject analysis
}

type AdvancedSubjectAnalysis struct {
	SubjectID       uuid.UUID                `json:"subject_id"`
	SubjectName     string                   `json:"subject_name"`
	IsSubsidiary    bool                     `json:"is_subsidiary"`
	TotalStudents   int                      `json:"total_students"`
	PaperAverages   []float64                `json:"paper_averages"`    // Average per paper
	OverallAverage  float64                  `json:"overall_average"`
	GradeDistribution map[string]int         `json:"grade_distribution"` // A, B, C, D, E, O, F counts
	PassRate        float64                  `json:"pass_rate"`          // For subsidiary: O+F pass rate
	FailRate        float64                  `json:"fail_rate"`          // For subsidiary: F fail rate
	Rank            int                      `json:"rank"`
	RankingCriteria string                   `json:"ranking_criteria"`   // "average" or "pass_rate"
}

type StudentDetail struct {
	StudentID     uuid.UUID                `json:"student_id"`
	StudentName   string                   `json:"student_name"`
	AdmissionNo   string                   `json:"admission_no"`
	Gender        string                   `json:"gender"`
	Subjects      []StudentSubjectDetail   `json:"subjects"`
	TotalPoints   int                      `json:"total_points,omitempty"`
	AverageMarks  float64                  `json:"average_marks"`
	OverallGrade  string                   `json:"overall_grade,omitempty"`
	Rank          int                      `json:"rank"`
}

type StudentSubjectDetail struct {
	SubjectID    uuid.UUID `json:"subject_id"`
	SubjectName  string    `json:"subject_name"`
	Papers       []float64 `json:"papers,omitempty"`       // For Advanced Level
	CA           float64   `json:"ca,omitempty"`           // For O-Level
	Exam         float64   `json:"exam,omitempty"`         // For O-Level
	Total        float64   `json:"total"`
	Grade        string    `json:"grade"`
	Points       int       `json:"points,omitempty"`       // For Advanced Level
}

type GradeContext struct {
	ClassName     string         `json:"class_name"`
	Level         string         `json:"level"`
	Stream        string         `json:"stream"`
	Year          int            `json:"year"`
	Term          string         `json:"term"`
	TotalStudents int            `json:"total_students"`
	GradeSummary  map[string]int `json:"grade_summary"` // Total count of each grade across all subjects
}

type SubjectOverview struct {
	SubjectID       uuid.UUID `json:"subject_id"`
	SubjectName     string    `json:"subject_name"`
	AverageScore    float64   `json:"average_score"`
	PreviousAverage *float64  `json:"previous_average,omitempty"`
	AverageChange   *float64  `json:"average_change,omitempty"`
	HighestScore    float64   `json:"highest_score"`
	LowestScore     float64   `json:"lowest_score"`
	PassRate        float64   `json:"pass_rate"`
	StudentCount    int       `json:"student_count"`
}

type GradeDistData struct {
	// O-Level grades
	A int `json:"a"`
	B int `json:"b"`
	C int `json:"c"`
	D int `json:"d"`
	E int `json:"e,omitempty"`
	// Advanced Level grades
	O int `json:"o,omitempty"`
	F int `json:"f"`
	// Primary grades
	D1 int `json:"d1,omitempty"`
	D2 int `json:"d2,omitempty"`
	C3 int `json:"c3,omitempty"`
	C4 int `json:"c4,omitempty"`
	C5 int `json:"c5,omitempty"`
	C6 int `json:"c6,omitempty"`
	P7 int `json:"p7,omitempty"`
	P8 int `json:"p8,omitempty"`
	F9 int `json:"f9,omitempty"`
	// Nursery grades
	Mastering  int `json:"mastering,omitempty"`
	Secure     int `json:"secure,omitempty"`
	Developing int `json:"developing,omitempty"`
	Emerging   int `json:"emerging,omitempty"`
	NotYet     int `json:"not_yet,omitempty"`
}

type SubjectRanking struct {
	SubjectName     string  `json:"subject_name"`
	AverageScore    float64 `json:"average_score"`
	PreviousAverage *float64 `json:"previous_average,omitempty"`
	AverageChange   *float64 `json:"average_change,omitempty"`
	PassRate        float64 `json:"pass_rate"`
	Rank            int     `json:"rank"`
	PreviousRank    *int    `json:"previous_rank,omitempty"`
	RankChange      *int    `json:"rank_change,omitempty"`
}

type SubjectTrend struct {
	SubjectName string       `json:"subject_name"`
	Trends      []TrendPoint `json:"trends"`
	Improvement float64      `json:"improvement"`
	Status      string       `json:"status"`
}

type DifficultyMetric struct {
	SubjectName string  `json:"subject_name"`
	FailRate    float64 `json:"fail_rate"`
	AvgScore    float64 `json:"avg_score"`
	Difficulty  string  `json:"difficulty"`
}

type TopStudent struct {
	StudentID   uuid.UUID `json:"student_id"`
	StudentName string    `json:"student_name"`
	Score       float64   `json:"score"`
	Grade       string    `json:"grade"`
	Papers      []float64 `json:"papers,omitempty"` // For Advanced Level paper breakdown
}

type SubjectConsistency struct {
	SubjectName       string  `json:"subject_name"`
	StandardDeviation float64 `json:"standard_deviation"`
	Variance          float64 `json:"variance"`
	ConsistencyLabel  string  `json:"consistency_label"`
}

type CrossGradeData struct {
	SubjectName string             `json:"subject_name"`
	GradeScores map[string]float64 `json:"grade_scores"`
	Trend       string             `json:"trend"`
}

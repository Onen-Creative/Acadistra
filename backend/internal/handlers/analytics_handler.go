package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AnalyticsHandler struct {
	db *gorm.DB
}

func NewAnalyticsHandler(db *gorm.DB) *AnalyticsHandler {
	return &AnalyticsHandler{db: db}
}

// SubjectPerformanceTrend compares subject performance across terms/years
func (h *AnalyticsHandler) SubjectPerformanceTrend(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	subjectID := c.Query("subject_id")
	classID := c.Query("class_id")
	level := c.Query("level")

	type TrendData struct {
		Term       string  `json:"term"`
		Year       int     `json:"year"`
		ExamType   string  `json:"exam_type"`
		Average    float64 `json:"average"`
		Highest    float64 `json:"highest"`
		Lowest     float64 `json:"lowest"`
		PassRate   float64 `json:"pass_rate"`
		TotalStudents int  `json:"total_students"`
	}

	// Determine if nursery level
	nurseryLevels := []string{"Baby", "Middle", "Top"}
	isNursery := false
	for _, nl := range nurseryLevels {
		if level == nl {
			isNursery = true
			break
		}
	}

	// For nursery, use mark field; for others use total
	markCalc := "COALESCE((sr.raw_marks->>'total')::float, 0)"
	if isNursery {
		markCalc = "(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0"
	}

	query := `
		SELECT 
			sr.term,
			sr.year,
			sr.exam_type,
			AVG(` + markCalc + `) as average,
			MAX(` + markCalc + `) as highest,
			MIN(` + markCalc + `) as lowest,
			COUNT(CASE WHEN ` + markCalc + ` >= 50 THEN 1 END)::float / 
				NULLIF(COUNT(*), 0) * 100 as pass_rate,
			COUNT(DISTINCT sr.student_id) as total_students
		FROM subject_results sr
		JOIN classes c ON sr.class_id = c.id
		WHERE sr.school_id = ?
	`
	args := []interface{}{schoolID}

	if subjectID != "" {
		query += " AND sr.subject_id = ?"
		args = append(args, subjectID)
	}
	if classID != "" {
		query += " AND sr.class_id = ?"
		args = append(args, classID)
	}
	if level != "" {
		query += " AND c.level = ?"
		args = append(args, level)
	}

	query += " GROUP BY sr.term, sr.year, sr.exam_type ORDER BY sr.year, sr.term, sr.exam_type"

	var trends []TrendData
	if err := h.db.Raw(query, args...).Scan(&trends).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"trends": trends})
}

// StudentProgressTracking tracks individual student performance over time
func (h *AnalyticsHandler) StudentProgressTracking(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")

	type ProgressData struct {
		Term         string  `json:"term"`
		Year         int     `json:"year"`
		ExamType     string  `json:"exam_type"`
		SubjectName  string  `json:"subject_name"`
		Total        float64 `json:"total"`
		Grade        string  `json:"grade"`
		ClassAverage float64 `json:"class_average"`
		Level        string  `json:"level"`
	}

	query := `
		SELECT 
			sr.term,
			sr.year,
			sr.exam_type,
			ss.name as subject_name,
			ss.level,
			CASE 
				WHEN ss.level IN ('Baby', 'Middle', 'Top') THEN 
					(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
				ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
			END as total,
			sr.final_grade as grade,
			(
				SELECT AVG(
					CASE 
						WHEN ss.level IN ('Baby', 'Middle', 'Top') THEN 
							(COALESCE((sr2.raw_marks->>'ca')::float, 0) + COALESCE((sr2.raw_marks->>'exam')::float, 0)) / 2.0
						ELSE COALESCE((sr2.raw_marks->>'total')::float, 0)
					END
				)
				FROM subject_results sr2
				WHERE sr2.class_id = sr.class_id
					AND sr2.subject_id = sr.subject_id
					AND sr2.term = sr.term
					AND sr2.year = sr.year
					AND sr2.exam_type = sr.exam_type
			) as class_average
		FROM subject_results sr
		JOIN standard_subjects ss ON sr.subject_id = ss.id
		WHERE sr.student_id = ? AND sr.school_id = ?
		ORDER BY sr.year, sr.term, ss.name
	`

	var progress []ProgressData
	if err := h.db.Raw(query, studentID, schoolID).Scan(&progress).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"progress": progress})
}

// ClassComparison compares performance across different classes
func (h *AnalyticsHandler) ClassComparison(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	examType := c.Query("exam_type")

	type ClassStats struct {
		ClassName     string  `json:"class_name"`
		Level         string  `json:"level"`
		Average       float64 `json:"average"`
		TotalStudents int     `json:"total_students"`
		PassRate      float64 `json:"pass_rate"`
	}

	query := `
		SELECT 
			c.name as class_name,
			c.level,
			AVG(
				CASE 
					WHEN c.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END
			) as average,
			COUNT(DISTINCT sr.student_id) as total_students,
			COUNT(CASE WHEN 
				CASE 
					WHEN c.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END >= 50 THEN 1 END)::float / 
				NULLIF(COUNT(*), 0) * 100 as pass_rate
		FROM subject_results sr
		JOIN classes c ON sr.class_id = c.id
		WHERE sr.school_id = ? AND sr.term = ? AND sr.year = ? AND sr.exam_type = ?
		GROUP BY c.id, c.name, c.level
		ORDER BY c.level, c.name
	`

	var stats []ClassStats
	if err := h.db.Raw(query, schoolID, term, year, examType).Scan(&stats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"classes": stats})
}

// SubjectComparison compares performance across subjects
func (h *AnalyticsHandler) SubjectComparison(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	term := c.Query("term")
	year := c.Query("year")
	examType := c.Query("exam_type")

	type SubjectStats struct {
		SubjectName   string  `json:"subject_name"`
		Average       float64 `json:"average"`
		Highest       float64 `json:"highest"`
		Lowest        float64 `json:"lowest"`
		PassRate      float64 `json:"pass_rate"`
		TotalStudents int     `json:"total_students"`
	}

	query := `
		SELECT 
			ss.name as subject_name,
			AVG(
				CASE 
					WHEN ss.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END
			) as average,
			MAX(
				CASE 
					WHEN ss.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END
			) as highest,
			MIN(
				CASE 
					WHEN ss.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END
			) as lowest,
			COUNT(CASE WHEN 
				CASE 
					WHEN ss.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END >= 50 THEN 1 END)::float / 
				NULLIF(COUNT(*), 0) * 100 as pass_rate,
			COUNT(DISTINCT sr.student_id) as total_students
		FROM subject_results sr
		JOIN standard_subjects ss ON sr.subject_id = ss.id
		WHERE sr.school_id = ? AND sr.class_id = ? AND sr.term = ? AND sr.year = ? AND sr.exam_type = ?
		GROUP BY ss.id, ss.name
		ORDER BY average DESC
	`

	var stats []SubjectStats
	if err := h.db.Raw(query, schoolID, classID, term, year, examType).Scan(&stats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"subjects": stats})
}

// TermComparison compares same class performance across different terms
func (h *AnalyticsHandler) TermComparison(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	year := c.Query("year")

	type TermStats struct {
		Term          string  `json:"term"`
		ExamType      string  `json:"exam_type"`
		Average       float64 `json:"average"`
		PassRate      float64 `json:"pass_rate"`
		TotalStudents int     `json:"total_students"`
	}

	query := `
		SELECT 
			sr.term,
			sr.exam_type,
			AVG(
				CASE 
					WHEN c.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END
			) as average,
			COUNT(CASE WHEN 
				CASE 
					WHEN c.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END >= 50 THEN 1 END)::float / 
				NULLIF(COUNT(*), 0) * 100 as pass_rate,
			COUNT(DISTINCT sr.student_id) as total_students
		FROM subject_results sr
		JOIN classes c ON sr.class_id = c.id
		WHERE sr.school_id = ? AND sr.class_id = ? AND sr.year = ?
		GROUP BY sr.term, sr.exam_type
		ORDER BY sr.term, sr.exam_type
	`

	var stats []TermStats
	if err := h.db.Raw(query, schoolID, classID, year).Scan(&stats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"terms": stats})
}

package repositories

import (
	"gorm.io/gorm"
)

type AnalyticsRepository struct {
	db *gorm.DB
}

func NewAnalyticsRepository(db *gorm.DB) *AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

func (r *AnalyticsRepository) GetSubjectPerformanceTrend(schoolID, subjectID, classID, level string) ([]map[string]interface{}, error) {
	nurseryLevels := []string{"Baby", "Middle", "Top"}
	isNursery := false
	for _, nl := range nurseryLevels {
		if level == nl {
			isNursery = true
			break
		}
	}

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

	var trends []map[string]interface{}
	err := r.db.Raw(query, args...).Scan(&trends).Error
	return trends, err
}

func (r *AnalyticsRepository) GetStudentProgressTracking(schoolID, studentID string) ([]map[string]interface{}, error) {
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

	var progress []map[string]interface{}
	err := r.db.Raw(query, studentID, schoolID).Scan(&progress).Error
	return progress, err
}

func (r *AnalyticsRepository) GetClassComparison(schoolID, term, year, examType string) ([]map[string]interface{}, error) {
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
			MAX(
				CASE 
					WHEN c.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END
			) as highest,
			MIN(
				CASE 
					WHEN c.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END
			) as lowest,
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

	var stats []map[string]interface{}
	err := r.db.Raw(query, schoolID, term, year, examType).Scan(&stats).Error
	return stats, err
}

func (r *AnalyticsRepository) GetSubjectComparison(schoolID, classID, term, year, examType string) ([]map[string]interface{}, error) {
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

	var stats []map[string]interface{}
	err := r.db.Raw(query, schoolID, classID, term, year, examType).Scan(&stats).Error
	return stats, err
}

func (r *AnalyticsRepository) GetTermComparison(schoolID, classID, year string) ([]map[string]interface{}, error) {
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
			MAX(
				CASE 
					WHEN c.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END
			) as highest,
			MIN(
				CASE 
					WHEN c.level IN ('Baby', 'Middle', 'Top') THEN 
						(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) / 2.0
					ELSE COALESCE((sr.raw_marks->>'total')::float, 0)
				END
			) as lowest,
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

	var stats []map[string]interface{}
	err := r.db.Raw(query, schoolID, classID, year).Scan(&stats).Error
	return stats, err
}

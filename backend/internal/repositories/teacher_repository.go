package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type TeacherRepository interface {
	GetProfile(staffID, schoolID uuid.UUID) (*models.TeacherProfile, error)
	GetClasses(teacherID, schoolID uuid.UUID) ([]models.Class, error)
	GetSubjects(teacherID, schoolID uuid.UUID) ([]models.StandardSubject, error)
	GetStudents(teacherID, schoolID uuid.UUID) ([]models.Student, error)
	AssignClassSubject(assignment *models.ClassSubject) error
	RemoveClassSubject(classID, subjectID, schoolID uuid.UUID) error
	GetClassSubjects(classID, schoolID uuid.UUID) ([]models.ClassSubject, error)
	GetWorkload(teacherID, schoolID uuid.UUID) (map[string]interface{}, error)
	GetPerformance(teacherID, schoolID uuid.UUID, term, year string) (map[string]interface{}, error)
	GetAll(schoolID uuid.UUID) ([]models.Staff, error)
	GetStats(schoolID uuid.UUID) (map[string]interface{}, error)
}

type teacherRepository struct {
	db *gorm.DB
}

func NewTeacherRepository(db *gorm.DB) TeacherRepository {
	return &teacherRepository{db: db}
}

func (r *teacherRepository) GetProfile(staffID, schoolID uuid.UUID) (*models.TeacherProfile, error) {
	var profile models.TeacherProfile
	err := r.db.Where("staff_id = ? AND school_id = ?", staffID, schoolID).
		Preload("Staff").First(&profile).Error
	return &profile, err
}

func (r *teacherRepository) GetClasses(teacherID, schoolID uuid.UUID) ([]models.Class, error) {
	var classes []models.Class
	err := r.db.Raw(`
		SELECT DISTINCT c.*
		FROM classes c
		JOIN class_subjects cs ON c.id = cs.class_id
		WHERE cs.teacher_id = ? AND c.school_id = ?
		ORDER BY c.name
	`, teacherID, schoolID).Scan(&classes).Error
	return classes, err
}

func (r *teacherRepository) GetSubjects(teacherID, schoolID uuid.UUID) ([]models.StandardSubject, error) {
	var subjects []models.StandardSubject
	err := r.db.Raw(`
		SELECT DISTINCT ss.*
		FROM standard_subjects ss
		JOIN class_subjects cs ON ss.id = cs.subject_id
		WHERE cs.teacher_id = ? AND cs.school_id = ?
		ORDER BY ss.name
	`, teacherID, schoolID).Scan(&subjects).Error
	return subjects, err
}

func (r *teacherRepository) GetStudents(teacherID, schoolID uuid.UUID) ([]models.Student, error) {
	var students []models.Student
	err := r.db.Raw(`
		SELECT DISTINCT s.*
		FROM students s
		JOIN enrollments e ON s.id = e.student_id
		JOIN class_subjects cs ON e.class_id = cs.class_id
		WHERE cs.teacher_id = ? AND s.school_id = ? AND e.status = 'active'
		ORDER BY s.first_name, s.last_name
	`, teacherID, schoolID).Scan(&students).Error
	return students, err
}

func (r *teacherRepository) AssignClassSubject(assignment *models.ClassSubject) error {
	var existing models.ClassSubject
	err := r.db.Where("class_id = ? AND subject_id = ? AND school_id = ?", 
		assignment.ClassID, assignment.SubjectID, assignment.SchoolID).First(&existing).Error
	
	if err == nil {
		existing.TeacherID = assignment.TeacherID
		return r.db.Save(&existing).Error
	}
	
	return r.db.Create(assignment).Error
}

func (r *teacherRepository) RemoveClassSubject(classID, subjectID, schoolID uuid.UUID) error {
	return r.db.Where("class_id = ? AND subject_id = ? AND school_id = ?", 
		classID, subjectID, schoolID).Delete(&models.ClassSubject{}).Error
}

func (r *teacherRepository) GetClassSubjects(classID, schoolID uuid.UUID) ([]models.ClassSubject, error) {
	var assignments []models.ClassSubject
	err := r.db.Where("class_id = ? AND school_id = ?", classID, schoolID).
		Preload("Subject").Preload("Teacher").Find(&assignments).Error
	return assignments, err
}

func (r *teacherRepository) GetWorkload(teacherID, schoolID uuid.UUID) (map[string]interface{}, error) {
	workload := make(map[string]interface{})
	
	var totalClasses, totalSubjects, totalStudents int64
	
	r.db.Raw(`
		SELECT COUNT(DISTINCT class_id)
		FROM class_subjects
		WHERE teacher_id = ? AND school_id = ?
	`, teacherID, schoolID).Scan(&totalClasses)
	
	r.db.Raw(`
		SELECT COUNT(DISTINCT subject_id)
		FROM class_subjects
		WHERE teacher_id = ? AND school_id = ?
	`, teacherID, schoolID).Scan(&totalSubjects)
	
	r.db.Raw(`
		SELECT COUNT(DISTINCT s.id)
		FROM students s
		JOIN enrollments e ON s.id = e.student_id
		JOIN class_subjects cs ON e.class_id = cs.class_id
		WHERE cs.teacher_id = ? AND s.school_id = ? AND e.status = 'active'
	`, teacherID, schoolID).Scan(&totalStudents)
	
	var breakdown []struct {
		ClassName   string
		SubjectName string
		Students    int64
	}
	r.db.Raw(`
		SELECT 
			c.name as class_name,
			ss.name as subject_name,
			COUNT(DISTINCT e.student_id) as students
		FROM class_subjects cs
		JOIN classes c ON cs.class_id = c.id
		JOIN standard_subjects ss ON cs.subject_id = ss.id
		LEFT JOIN enrollments e ON c.id = e.class_id AND e.status = 'active'
		WHERE cs.teacher_id = ? AND cs.school_id = ?
		GROUP BY c.name, ss.name
		ORDER BY c.name, ss.name
	`, teacherID, schoolID).Scan(&breakdown)
	
	workload["total_classes"] = totalClasses
	workload["total_subjects"] = totalSubjects
	workload["total_students"] = totalStudents
	workload["breakdown"] = breakdown
	
	return workload, nil
}

func (r *teacherRepository) GetPerformance(teacherID, schoolID uuid.UUID, term, year string) (map[string]interface{}, error) {
	performance := make(map[string]interface{})
	
	var avgPerformance, passRate float64
	
	r.db.Raw(`
		SELECT AVG(
			COALESCE((sr.raw_marks->>'ca')::float, 0) + 
			COALESCE((sr.raw_marks->>'exam')::float, 0)
		)
		FROM subject_results sr
		JOIN class_subjects cs ON sr.class_id = cs.class_id AND sr.subject_id = cs.subject_id
		WHERE cs.teacher_id = ? AND sr.school_id = ? AND sr.term = ? AND sr.year = ?
	`, teacherID, schoolID, term, year).Scan(&avgPerformance)
	
	r.db.Raw(`
		SELECT 
			CASE 
				WHEN COUNT(*) > 0 THEN
					ROUND(SUM(CASE 
						WHEN (COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) >= 50 
						THEN 1 ELSE 0 
					END)::numeric / COUNT(*) * 100, 2)
				ELSE 0 
			END
		FROM subject_results sr
		JOIN class_subjects cs ON sr.class_id = cs.class_id AND sr.subject_id = cs.subject_id
		WHERE cs.teacher_id = ? AND sr.school_id = ? AND sr.term = ? AND sr.year = ?
	`, teacherID, schoolID, term, year).Scan(&passRate)
	
	var classPerformance []struct {
		ClassName string
		Average   float64
		PassRate  float64
	}
	r.db.Raw(`
		SELECT 
			c.name as class_name,
			AVG(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) as average,
			ROUND(SUM(CASE 
				WHEN (COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) >= 50 
				THEN 1 ELSE 0 
			END)::numeric / COUNT(*) * 100, 2) as pass_rate
		FROM subject_results sr
		JOIN classes c ON sr.class_id = c.id
		JOIN class_subjects cs ON sr.class_id = cs.class_id AND sr.subject_id = cs.subject_id
		WHERE cs.teacher_id = ? AND sr.school_id = ? AND sr.term = ? AND sr.year = ?
		GROUP BY c.name
		ORDER BY c.name
	`, teacherID, schoolID, term, year).Scan(&classPerformance)
	
	performance["average_performance"] = avgPerformance
	performance["pass_rate"] = passRate
	performance["by_class"] = classPerformance
	
	return performance, nil
}

func (r *teacherRepository) GetAll(schoolID uuid.UUID) ([]models.Staff, error) {
	var teachers []models.Staff
	err := r.db.Where("school_id = ? AND role = ? AND status = ?", 
		schoolID, "Teacher", "active").
		Preload("User").Find(&teachers).Error
	return teachers, err
}

func (r *teacherRepository) GetStats(schoolID uuid.UUID) (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	
	var totalTeachers int64
	r.db.Model(&models.Staff{}).
		Where("school_id = ? AND role = ? AND status = ?", schoolID, "Teacher", "active").
		Count(&totalTeachers)
	
	var deptStats []struct {
		Department string
		Count      int64
	}
	r.db.Model(&models.Staff{}).
		Select("department, COUNT(*) as count").
		Where("school_id = ? AND role = ? AND status = ?", schoolID, "Teacher", "active").
		Group("department").
		Scan(&deptStats)
	
	var qualStats []struct {
		Qualifications string
		Count          int64
	}
	r.db.Model(&models.Staff{}).
		Select("qualifications, COUNT(*) as count").
		Where("school_id = ? AND role = ? AND status = ?", schoolID, "Teacher", "active").
		Group("qualifications").
		Scan(&qualStats)
	
	stats["total_teachers"] = totalTeachers
	stats["by_department"] = deptStats
	stats["by_qualification"] = qualStats
	
	return stats, nil
}

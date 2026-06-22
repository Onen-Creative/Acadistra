# Student Availability Across Terms - How It Works

## Current Implementation (✅ Correct)

The system is **already implemented correctly**. Here's how it works:

### Classes are Yearly
- One class created per year: **P1 Blue 2024**
- Same class used for Term 1, Term 2, and Term 3

### Students Must Be Enrolled Per Term
- Students are enrolled in the **same class** for each term
- Enrollment records track which term(s) a student is in that class

### Example

**Class**: P1 Blue 2024 (created once)

**Enrollments**:
```sql
student_id | class_id        | year | term | status
-----------+-----------------+------+------+--------
john-uuid  | p1-blue-2024-id | 2024 |  1   | active
john-uuid  | p1-blue-2024-id | 2024 |  2   | active  
john-uuid  | p1-blue-2024-id | 2024 |  3   | active

mary-uuid  | p1-blue-2024-id | 2024 |  1   | active
mary-uuid  | p1-blue-2024-id | 2024 |  2   | active
mary-uuid  | p1-blue-2024-id | 2024 |  3   | active
```

**Same class, different enrollment records per term.**

---

## How GetStudents Works

```go
// class_service.go - Line 125
func (s *ClassService) GetStudents(classID, year, term string) {
    query := s.db.Preload("Student").Where("class_id = ? AND status = ?", classID, "active")
    
    if term != "" {
        query = query.Where("term = ?", term)  // Filters by term
    }
    
    // Returns students enrolled in this class for the specified term
}
```

### When You Query:
- `GET /api/classes/{id}/students?term=1` → Returns students enrolled in Term 1
- `GET /api/classes/{id}/students?term=2` → Returns students enrolled in Term 2
- `GET /api/classes/{id}/students?term=3` → Returns students enrolled in Term 3

---

## The Real Issue

### Scenario 1: Students Only Enrolled for Term 1
**What You Have**:
```sql
student_id | class_id        | year | term | status
-----------+-----------------+------+------+--------
john-uuid  | p1-blue-2024-id | 2024 |  1   | active
mary-uuid  | p1-blue-2024-id | 2024 |  1   | active
```

**Result**: 
- Term 1: ✅ Shows John and Mary
- Term 2: ❌ Shows nobody (no enrollments for term 2)
- Term 3: ❌ Shows nobody (no enrollments for term 3)

### Scenario 2: Students Enrolled for All Terms (Correct)
**What You Should Have**:
```sql
student_id | class_id        | year | term | status
-----------+-----------------+------+------+--------
john-uuid  | p1-blue-2024-id | 2024 |  1   | active
john-uuid  | p1-blue-2024-id | 2024 |  2   | active
john-uuid  | p1-blue-2024-id | 2024 |  3   | active
mary-uuid  | p1-blue-2024-id | 2024 |  1   | active
mary-uuid  | p1-blue-2024-id | 2024 |  2   | active
mary-uuid  | p1-blue-2024-id | 2024 |  3   | active
```

**Result**: 
- Term 1: ✅ Shows John and Mary
- Term 2: ✅ Shows John and Mary
- Term 3: ✅ Shows John and Mary

---

## Solution Options

### Option 1: Enroll Students for All Terms Upfront (Recommended)

When registering a student, create 3 enrollment records:

```go
// When student joins in Term 1
student := createStudent(...)

// Create enrollments for all remaining terms in the year
for _, term := range []string{"1", "2", "3"} {
    enrollment := models.Enrollment{
        StudentID:  student.ID,
        ClassID:    classID,
        Year:       2024,
        Term:       term,
        Status:     "active",
        EnrolledOn: time.Now(),
    }
    db.Create(&enrollment)
}
```

**Pros**: Simple, students available immediately for all terms
**Cons**: Creates future records

### Option 2: Enroll Students at Start of Each Term

At the beginning of Term 2:

```sql
-- Copy Term 1 enrollments to Term 2
INSERT INTO enrollments (student_id, class_id, year, term, status, enrolled_on)
SELECT student_id, class_id, year, '2', status, NOW()
FROM enrollments 
WHERE year = 2024 AND term = '1' AND status = 'active';
```

**Pros**: Only creates records for active terms
**Cons**: Requires manual action each term

### Option 3: Fallback to Previous Term (Not Recommended)

Modify `GetStudents` to fallback if no enrollments found:

```go
func (s *ClassService) GetStudents(classID, year, term string) ([]models.Student, error) {
    // Try current term first
    students := queryEnrollments(classID, year, term)
    
    // If empty, fallback to previous term
    if len(students) == 0 && term == "2" {
        students = queryEnrollments(classID, year, "1")
    } else if len(students) == 0 && term == "3" {
        students = queryEnrollments(classID, year, "2")
    }
    
    return students
}
```

**Pros**: Automatic
**Cons**: Confusing, doesn't track actual term enrollment

---

## Recommended Approach

### For New Students
When a student is enrolled, create enrollment records for **all remaining terms** in the current academic year:

```go
currentTerm := getCurrentTerm() // e.g., "1"
remainingTerms := []string{}

switch currentTerm {
case "1":
    remainingTerms = []string{"1", "2", "3"}
case "2":
    remainingTerms = []string{"2", "3"}
case "3":
    remainingTerms = []string{"3"}
}

for _, term := range remainingTerms {
    enrollment := models.Enrollment{
        StudentID:  student.ID,
        ClassID:    classID,
        Year:       currentYear,
        Term:       term,
        Status:     "active",
        EnrolledOn: time.Now(),
    }
    db.Create(&enrollment)
}
```

### For Existing Students (Migration/Bulk Update)
Create a one-time script to enroll all currently enrolled students for Terms 2 and 3:

```sql
-- For each student enrolled in Term 1, create Term 2 and Term 3 enrollments
INSERT INTO enrollments (id, student_id, class_id, year, term, status, enrolled_on, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    student_id,
    class_id,
    year,
    '2',  -- Term 2
    status,
    enrolled_on,
    NOW(),
    NOW()
FROM enrollments
WHERE year = 2024 AND term = '1' AND status = 'active'
ON CONFLICT DO NOTHING;

-- Same for Term 3
INSERT INTO enrollments (id, student_id, class_id, year, term, status, enrolled_on, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    student_id,
    class_id,
    year,
    '3',  -- Term 3
    status,
    enrolled_on,
    NOW(),
    NOW()
FROM enrollments
WHERE year = 2024 AND term = '1' AND status = 'active'
ON CONFLICT DO NOTHING;
```

---

## Verification

After enrolling students for all terms:

```sql
-- Check enrollments per term for a class
SELECT term, COUNT(*) as student_count
FROM enrollments
WHERE class_id = 'your-class-uuid' 
  AND year = 2024 
  AND status = 'active'
GROUP BY term
ORDER BY term;
```

Expected output:
```
term | student_count
-----+--------------
  1  |     30
  2  |     30
  3  |     30
```

---

## Summary

### ✅ What's Already Working
- Classes are yearly (one class for all terms)
- GetStudents correctly filters by term
- Enrollments properly track term

### ⚠️ What You Need to Do
- **Enroll students for ALL terms** when they join
- **For existing students**: Run SQL to create Term 2 and Term 3 enrollments

### 🎯 Quick Fix for Live Server

Run this SQL on your database:

```sql
-- Create Term 2 enrollments from Term 1
INSERT INTO enrollments (id, student_id, class_id, year, term, status, enrolled_on, created_at, updated_at)
SELECT gen_random_uuid(), student_id, class_id, year, '2', status, enrolled_on, NOW(), NOW()
FROM enrollments
WHERE year = 2024 AND term = '1' AND status = 'active'
ON CONFLICT (student_id, class_id, year, term) DO NOTHING;

-- Create Term 3 enrollments from Term 1  
INSERT INTO enrollments (id, student_id, class_id, year, term, status, enrolled_on, created_at, updated_at)
SELECT gen_random_uuid(), student_id, class_id, year, '3', status, enrolled_on, NOW(), NOW()
FROM enrollments
WHERE year = 2024 AND term = '1' AND status = 'active'
ON CONFLICT (student_id, class_id, year, term) DO NOTHING;
```

After running this, all students enrolled in Term 1 will be available for Terms 2 and 3.

---

**The system is working correctly. You just need to enroll students for all terms.**

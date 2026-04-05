# Student Count Fix - Exclude Deleted Students

## Issue
Class student counts were including soft-deleted students, causing incorrect enrollment numbers.

## Root Cause
Queries counting students in classes were only checking for `enrollments.status = 'active'` but not verifying that the student record itself wasn't soft-deleted (`students.deleted_at IS NULL`).

## Files Modified

### 1. `/backend/internal/handlers/class_handler.go`

**Line ~50-60 (List method):**
```go
// BEFORE
h.db.Model(&models.Enrollment{}).Where("class_id = ? AND status = ?", class.ID, "active").Count(&count)

// AFTER
h.db.Model(&models.Enrollment{}).
    Joins("JOIN students ON students.id = enrollments.student_id AND students.deleted_at IS NULL").
    Where("enrollments.class_id = ? AND enrollments.status = ?", class.ID, "active").
    Count(&count)
```

**Line ~230-240 (Delete method):**
```go
// BEFORE
h.db.Model(&models.Enrollment{}).Where("class_id = ? AND status = ?", id, "active").Count(&count)

// AFTER
h.db.Model(&models.Enrollment{}).
    Joins("JOIN students ON students.id = enrollments.student_id AND students.deleted_at IS NULL").
    Where("enrollments.class_id = ? AND enrollments.status = ?", id, "active").
    Count(&count)
```

### 2. `/backend/internal/handlers/attendance_handler.go`

**Line ~573 (GetClassAttendanceSummary method):**
```go
// BEFORE
h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
    Where("enrollments.class_id = ? AND enrollments.status = 'active' AND students.school_id = ?", classID, schoolID).
    Find(&students)

// AFTER
h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
    Where("enrollments.class_id = ? AND enrollments.status = 'active' AND students.school_id = ? AND students.deleted_at IS NULL", classID, schoolID).
    Find(&students)
```

**Line ~893 (GetAttendanceReport method):**
```go
// BEFORE
h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
    Where("enrollments.class_id = ? AND enrollments.status = 'active' AND students.school_id = ?", classID, schoolID).
    Order("students.first_name, students.last_name").
    Find(&students)

// AFTER
h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
    Where("enrollments.class_id = ? AND enrollments.status = 'active' AND students.school_id = ? AND students.deleted_at IS NULL", classID, schoolID).
    Order("students.first_name, students.last_name").
    Find(&students)
```

## Solution
Added `JOIN students ON students.id = enrollments.student_id AND students.deleted_at IS NULL` to all enrollment count queries to ensure:
1. Only active enrollments are counted
2. Only non-deleted students are included
3. Soft-deleted students are properly excluded from all counts

## Impact
- ✅ Class student counts now accurately reflect only active, non-deleted students
- ✅ Class deletion checks now correctly validate against actual enrolled students
- ✅ Attendance reports exclude deleted students
- ✅ Attendance summaries show correct student lists

## Testing
To verify the fix:

1. **Test student count:**
   ```bash
   GET /api/v1/classes?year=2025&term=1
   ```
   - Verify `student_count` only includes active, non-deleted students

2. **Test class deletion:**
   ```bash
   DELETE /api/v1/classes/{class_id}
   ```
   - Should allow deletion if no active non-deleted students
   - Should block deletion if active non-deleted students exist

3. **Test attendance summary:**
   ```bash
   GET /api/v1/attendance/summary?class_id={class_id}
   ```
   - Verify deleted students don't appear in the list

## Database Query Pattern
All queries counting or listing students should follow this pattern:

```go
db.Model(&models.Enrollment{}).
    Joins("JOIN students ON students.id = enrollments.student_id AND students.deleted_at IS NULL").
    Where("enrollments.class_id = ? AND enrollments.status = ?", classID, "active").
    Count(&count)
```

## Notes
- GORM's soft delete automatically adds `deleted_at IS NULL` when querying the Student model directly
- However, when joining tables, we must explicitly check `deleted_at IS NULL`
- This ensures consistency across all student-related queries

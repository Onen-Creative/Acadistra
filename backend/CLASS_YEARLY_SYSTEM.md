# Class Management: Yearly System

## Overview
Classes are now created **yearly** instead of termly. The same class is used for all three terms (Term 1, Term 2, Term 3) within an academic year.

## Why This Change?

### Before (Termly Classes)
- Classes created per term: P1 Blue Term 1, P1 Blue Term 2, P1 Blue Term 3
- Students had to be re-enrolled every term
- Data duplication and management overhead
- Inconsistent student groupings across terms

### After (Yearly Classes)
- Classes created once per year: P1 Blue 2024
- Same students throughout the year
- Enrollments track which term(s) a student is active
- Natural student progression (P1 → P2 → P3, etc.)

## Database Schema

### Class Table
```sql
CREATE TABLE classes (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,  -- e.g., "P1 Blue"
    level VARCHAR(50) NOT NULL,  -- e.g., "P1"
    stream VARCHAR(10),           -- e.g., "Blue"
    year INT NOT NULL,            -- e.g., 2024
    capacity INT DEFAULT 30,
    teacher_profile_id UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(school_id, level, stream, year)
);
```

### Enrollment Table (Tracks Term-Specific Data)
```sql
CREATE TABLE enrollments (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    class_id UUID NOT NULL,      -- References the yearly class
    year INT NOT NULL,            -- Same as class.year
    term VARCHAR(10) NOT NULL,    -- "1", "2", or "3"
    status VARCHAR(20) DEFAULT 'active',
    enrolled_on DATE,
    left_on DATE,
    UNIQUE(student_id, class_id, year, term)
);
```

## How It Works

### Creating Classes
1. Admin creates class for the year (e.g., P1 Blue for 2024)
2. No need to specify term - class is used for all terms
3. Duplicate prevention: One class per school/level/stream/year

```json
POST /api/classes
{
  "school_id": "...",
  "level": "P1",
  "stream": "Blue",
  "year": 2024,
  "capacity": 35,
  "teacher_profile_id": "..."
}
```

### Enrolling Students
Students are enrolled in the yearly class with term specified:

```json
POST /api/enrollments
{
  "student_id": "...",
  "class_id": "...",  // P1 Blue 2024
  "year": 2024,
  "term": "1",
  "status": "active"
}
```

The same student can have enrollments for all three terms:
- P1 Blue 2024, Term 1
- P1 Blue 2024, Term 2
- P1 Blue 2024, Term 3

### Student Progression
At the end of the year (after Term 3):
1. Students move to next level (P1 → P2)
2. New classes created for next year (2025)
3. Students enrolled in new classes:
   - From: P1 Blue 2024
   - To: P2 Blue 2025

## Benefits

### 1. Data Consistency
- Students stay with same classmates throughout the year
- One source of truth for class composition

### 2. Simplified Management
- Create classes once per year, not per term
- Automatic term rollover within the same year
- Easier bulk operations

### 3. Accurate Reporting
- Year-long analytics (attendance, performance trends)
- Compare students within consistent groups
- Track progression naturally

### 4. Better User Experience
- Teachers see their class for the whole year
- Parents see consistent class assignment
- Admins manage fewer entities

## API Changes

### Class Listing
```
GET /api/classes?year=2024&level=P1
```
Returns classes for the entire year. The `term` parameter is **ignored** for class lookup but can be used to filter enrollment counts.

### Student Class Assignment
```
GET /api/students/:id/class?year=2024&term=2
```
Returns the class the student is enrolled in for that specific term.

### Class Students
```
GET /api/classes/:id/students?term=2
```
Returns students enrolled in that class for the specified term (via enrollments).

## Migration Guide

### For Existing Deployments

1. **Backup Database**
   ```bash
   ./scripts/backup.sh
   ```

2. **Run Migration**
   ```bash
   docker exec acadistra_backend ./main migrate
   # Or directly:
   psql -f migrations/20260702000000_make_classes_yearly.sql
   ```

3. **Verify**
   - Check classes have no `term` field
   - Verify unique constraint on (school_id, level, stream, year)
   - Test class creation and enrollment

### For New Deployments
Migration runs automatically on first startup.

## Frontend Changes Required

### Update Class Creation Forms
- Remove "Term" field from class creation
- Update validation messages
- Show "Year" prominently

### Update Class Display
- Show "P1 Blue (2024)" instead of "P1 Blue Term 1"
- Filter by term when showing students
- Display enrollment counts per term

### Update Enrollment Logic
- Enroll students in yearly classes
- Specify term during enrollment
- Allow re-enrollment for new terms in same class

## Example Scenarios

### Scenario 1: New Academic Year
```
Jan 2024: Create P1 Blue, P1 Red, P2 Blue, etc. for 2024
Term 1: Enroll 30 students in P1 Blue (term=1)
Term 2: Same 30 students continue (term=2)
Term 3: Same 30 students continue (term=3)

Jan 2025: Create P2 Blue, P2 Red for 2025
         Move P1 2024 students to P2 2025
```

### Scenario 2: Mid-Year Transfer
```
Student John: P1 Blue Term 1 ✓
Transfer to P1 Red in Term 2
- End enrollment: P1 Blue (left_on = Term 1 end date)
- New enrollment: P1 Red Term 2 ✓
```

### Scenario 3: Multi-Stream Classes
```
2024:
- P1 Blue (30 students) - Year-long
- P1 Red (28 students) - Year-long
- P1 Green (32 students) - Year-long

Each student enrolled once per term, stays in same stream all year
```

## Testing Checklist

- [ ] Create class without term field
- [ ] Duplicate class prevention (same level/stream/year)
- [ ] Enroll students for Term 1
- [ ] Re-enroll same students for Term 2, Term 3
- [ ] View class students filtered by term
- [ ] Transfer student between classes mid-year
- [ ] Progress students to next year/level
- [ ] Generate reports per term for yearly class
- [ ] Calculate year-end results using all three terms

## Rollback Plan
If issues occur, restore from backup:
```bash
psql < backups/backup_YYYYMMDD_HHMMSS.sql
```

The previous schema supported both models, so legacy data remains accessible.

---

**Status**: ✅ Implemented
**Version**: 1.0
**Date**: July 2, 2026

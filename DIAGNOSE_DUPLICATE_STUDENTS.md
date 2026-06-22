# Diagnostic: Check Existing Students in S2 A

## Run these SQL commands to diagnose the issue:

```sql
-- 1. Check how many students exist with admission numbers starting with TMHS/S2 A/2026/
SELECT admission_no, first_name, last_name, created_at, status
FROM students
WHERE admission_no LIKE 'TMHS/S2 A/2026/%'
ORDER BY admission_no;

-- 2. Check enrollments for S2 A class in 2026
SELECT 
    s.admission_no, 
    s.first_name, 
    s.last_name,
    c.name as class_name,
    e.year,
    e.status as enrollment_status
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN classes c ON c.id = e.class_id
WHERE c.name LIKE '%S2%A%' 
  AND e.year = 2026
ORDER BY s.admission_no;

-- 3. Check if student TMHS/S2 A/2026/004 specifically exists
SELECT 
    id,
    admission_no, 
    first_name, 
    last_name, 
    created_at,
    status,
    deleted_at
FROM students
WHERE admission_no = 'TMHS/S2 A/2026/004';

-- 4. Check all classes for S2 in 2026
SELECT id, name, level, stream, year, capacity
FROM classes
WHERE level = 'S2' AND year = 2026;
```

## Solutions:

### If Student Already Exists:

**Option 1: Skip Duplicate in Excel**
- Remove the duplicate row from your Excel file
- Re-upload

**Option 2: Delete and Re-import**
```sql
-- Delete the existing student
DELETE FROM students WHERE admission_no = 'TMHS/S2 A/2026/004';
-- Then re-import
```

**Option 3: Update Import Logic** (Recommended)
- Modify import to skip duplicates instead of failing
- Or add "update if exists" logic

### If Excel Has Duplicates:

1. Open your Excel file
2. Check for duplicate rows (same student listed multiple times)
3. Remove duplicates
4. Re-upload

## Quick Command to Run:

```bash
# Check on local database
export PGPASSWORD='postgres' && psql -h localhost -U postgres -d school_system_db -c "
SELECT admission_no, first_name, last_name, created_at 
FROM students 
WHERE admission_no LIKE 'TMHS/S2 A/2026/%' 
ORDER BY admission_no;
"
```

This will show you all students with S2 A admission numbers that already exist.

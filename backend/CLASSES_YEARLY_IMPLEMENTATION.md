# Classes Now Yearly - Implementation Summary

## What Changed

Classes are now created **once per academic year** and used across all three terms, instead of being created separately for each term.

## Files Modified

### 1. **backend/internal/models/models.go**
- **Removed** `Term` field from `Class` struct
- **Updated** indexes from `idx_class_school_year_term` to `idx_class_school_year`
- **Added** unique constraint on `(school_id, level, stream, year)`

**Key Change:**
```go
// BEFORE
type Class struct {
    Year  int    `gorm:"not null;index:idx_class_school_year_term"`
    Term  string `gorm:"type:varchar(10);not null;index:idx_class_school_year_term"`
}

// AFTER
type Class struct {
    Year int `gorm:"not null;index:idx_class_school_year;uniqueIndex:idx_class_unique"`
    // Term removed - classes are yearly
}
```

### 2. **backend/internal/services/class_service.go**
- **Updated** `List()` to ignore term parameter for class lookup
- **Updated** `Create()` duplicate check to remove term validation
- **Changed** error message from "exists for this term/year" to "exists for this year"

**Key Change:**
```go
// BEFORE
s.repo.FindDuplicate(class.SchoolID, class.Level, class.Stream, fmt.Sprint(class.Year), class.Term)

// AFTER
s.repo.FindDuplicate(class.SchoolID, class.Level, class.Stream, fmt.Sprint(class.Year), "")
```

### 3. **backend/internal/repositories/class_repository.go**
- **Updated** `FindDuplicate()` signature to remove term parameter
- **Updated** `FindByYearAndTerm()` to ignore term (kept for backward compatibility)
- **Updated** `FindByFilters()` to ignore term parameter
- **Added** deprecation comment on `FindByYearAndTerm()`

**Key Change:**
```go
// BEFORE
FindDuplicate(schoolID uuid.UUID, level, stream, year, term string) (*models.Class, error)

// AFTER
FindDuplicate(schoolID uuid.UUID, level, stream, year string) (*models.Class, error)
```

### 4. **backend/migrations/20260702000000_make_classes_yearly.sql** (NEW)
Database migration that:
- Drops old `idx_class_school_year_term` index
- Removes `term` column from `classes` table
- Creates unique constraint on `(school_id, level, stream, year)`
- Creates new index on `(school_id, year)`

### 5. **backend/CLASS_YEARLY_SYSTEM.md** (NEW)
Comprehensive documentation covering:
- Why the change was made
- Database schema updates
- How enrollments track term-specific data
- API changes required
- Migration guide
- Frontend changes needed
- Example scenarios
- Testing checklist

### 6. **README.md**
- Added "Yearly class system" to features list

## How It Works Now

### Class Creation (Yearly)
```json
POST /api/classes
{
  "school_id": "uuid",
  "level": "P1",
  "stream": "Blue",
  "year": 2024,
  "capacity": 35
}
```
Creates **one class** for the entire year 2024.

### Student Enrollment (Per Term)
```json
POST /api/enrollments
{
  "student_id": "uuid",
  "class_id": "uuid",  // References yearly class
  "year": 2024,
  "term": "1",         // Specific term
  "status": "active"
}
```
Students are enrolled in the **yearly class** but enrollment specifies which **term**.

### Same Student, Multiple Terms
```
Enrollment 1: P1 Blue 2024, Term 1
Enrollment 2: P1 Blue 2024, Term 2
Enrollment 3: P1 Blue 2024, Term 3
```
All reference the **same class** created once.

## Benefits

1. **Consistency**: Students stay with same classmates all year
2. **Simplified Management**: Create classes once, not three times
3. **Natural Progression**: P1 2024 → P2 2025
4. **Better Reporting**: Year-long analytics and comparisons
5. **Reduced Duplication**: Less data, clearer relationships

## Migration Path

### For Existing Deployments
1. Backup database: `./scripts/backup.sh`
2. Run migration: `docker exec acadistra_backend ./main migrate`
3. Verify no `term` field in classes table

### For New Deployments
Migration runs automatically on first startup.

## API Behavior Changes

### ✅ Backward Compatible
- `/api/classes?year=2024&term=1` - Still works, term ignored for class lookup
- `/api/classes/:id/students?term=1` - Returns students for that term via enrollments

### ⚠️ Breaking Changes
- Creating class with `term` field will be **ignored**
- Duplicate classes prevented at year level (not term level)

## Frontend Updates Required

1. **Remove** term field from class creation forms
2. **Update** class display to show year (not term)
3. **Filter** student lists by term when displaying class roster
4. **Update** validation messages about duplicates

## Testing Checklist

- [x] Remove term field from Class model
- [x] Update class service logic
- [x] Update repository methods
- [x] Create database migration
- [x] Create documentation
- [x] Update README

## Remaining Tasks

- [ ] Run database migration on production
- [ ] Update frontend class forms
- [ ] Update frontend class displays
- [ ] Test class creation workflow
- [ ] Test student enrollment workflow
- [ ] Update API documentation/Swagger
- [ ] Notify users of change

## Rollback Plan

If issues occur:
```bash
# Restore from backup
psql < backups/backup_YYYYMMDD_HHMMSS.sql

# Revert code changes
git revert <commit-hash>
```

## Questions & Answers

**Q: What happens to existing classes with terms?**
A: Migration removes term field. Existing classes become yearly classes.

**Q: Can students change classes mid-year?**
A: Yes, via enrollments. End enrollment in Class A (term 1), start in Class B (term 2).

**Q: How do we track which term a student is in?**
A: Through the `enrollments` table which has both `class_id` and `term` fields.

**Q: What about reports per term?**
A: Filter by `enrollments.term` when querying students in a class.

---

**Status**: ✅ Code Complete - Ready for Testing
**Next Step**: Run migration and test in development environment

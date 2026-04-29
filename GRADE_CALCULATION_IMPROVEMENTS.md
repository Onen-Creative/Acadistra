# Grade Calculation Service - Improvements

## Problem Statement
Previously, grade calculation logic was duplicated across multiple handlers:
- `bulk_exam_marks_import_handler.go`
- `bulk_aoi_marks_import_handler.go`
- `bulk_ca_marks_import_handler.go`
- `result_handler.go`

This led to:
1. **Inconsistent grading** when marks were imported in different orders
2. **Code duplication** making maintenance difficult
3. **Potential bugs** when updating grading logic in one place but not others

## Solution: Centralized Grade Calculation Service

Created `services/grade_calculation_service.go` that provides a single source of truth for all grade calculations.

### Key Features

#### 1. **Order-Independent Grade Calculation**
The service automatically handles both import orders:

**Scenario A: AOI First, Then Exam**
```
1. AOI imported → Stored in integration_activities
2. Exam imported → Service fetches AOI automatically → Calculates complete grade
```

**Scenario B: Exam First, Then AOI**
```
1. Exam imported → Grade calculated with AOI=0 (incomplete)
2. AOI imported → Service updates ALL existing results with new AOI → Recalculates grades
```

#### 2. **Consistent Grading Logic**
All handlers now use the same calculation methods:

```go
// For exam marks import (S1-S4)
gradeResult, rawMarks, err := gradeCalculationService.CalculateGradeForResult(
    level,           // "S1", "S2", etc.
    studentID,
    subjectID,
    term,
    year,
    examMark,        // Exam mark entered
    existingCA,      // Optional: if CA already exists
)
// Service automatically fetches AOI marks for S1-S4
```

```go
// For AOI marks import (S1-S4)
err := gradeCalculationService.UpdateAllResultsWithAOI(
    studentID,
    subjectID,
    term,
    year,
    aoiMarks,        // New AOI marks
)
// Service updates ALL existing exam results with new AOI
```

```go
// For CA marks import (Primary/Nursery)
gradeResult, rawMarks := gradeCalculationService.RecalculateGradeWithCA(
    level,
    caMark,
    examMark,
)
```

#### 3. **Level-Specific Handling**

**S1-S4 (NCDC):**
- Always fetches AOI marks from `integration_activities` table
- Calculates: `(AOI/20)*20% + (Exam/80)*80%`
- Grades: A (≥80), B (≥65), C (≥50), D (≥35), E (<35)

**P1-P7 (Primary):**
- Uses provided CA or 0 if not available
- Calculates: `(CA/40)*40% + (Exam/60)*60%`
- Grades: D1-D2, C3-C6, P7-P8, F9

**Baby/Middle/Top (Nursery):**
- Uses provided CA or 0 if not available
- Calculates: `(CA + Exam) / 2`
- Grades: Mastering, Secure, Developing, Emerging, Not Yet

**S5-S6 (UACE):**
- Paper-based grading (mark out of 100)
- Maps to codes 1-9, then to letter grades D1-F9

### Benefits

✅ **Single Source of Truth** - All grade calculations use the same logic
✅ **Order Independent** - Import AOI or Exam first, result is the same
✅ **Automatic Updates** - When AOI changes, all related results update automatically
✅ **Easy Maintenance** - Update grading logic in one place
✅ **Consistent Results** - No more discrepancies between manual and imported grades
✅ **Better Testing** - Centralized service is easier to unit test

### Files Modified

1. **Created:**
   - `backend/internal/services/grade_calculation_service.go`

2. **Refactored:**
   - `backend/internal/handlers/bulk_exam_marks_import_handler.go`
   - `backend/internal/handlers/bulk_aoi_marks_import_handler.go`
   - `backend/internal/handlers/bulk_ca_marks_import_handler.go`

### Migration Notes

**No database changes required** - This is a code refactoring only.

**Existing data:** Run the grade recalculation endpoint to ensure all existing grades use the new logic:
```bash
POST /api/v1/recalculate-grades?term=Term%201&year=2026&level=S1
```

### Testing Recommendations

1. **Test AOI → Exam order:**
   - Import AOI marks for a student
   - Import Exam marks for same student
   - Verify grade is correct

2. **Test Exam → AOI order:**
   - Import Exam marks for a student
   - Import AOI marks for same student
   - Verify grade updates automatically

3. **Test AOI update:**
   - Import AOI marks
   - Import Exam marks
   - Update AOI marks
   - Verify all exam results update with new grade

4. **Test all levels:**
   - Nursery (Baby/Middle/Top)
   - Primary (P1-P7)
   - O-Level (S1-S4)
   - A-Level (S5-S6)

### Future Enhancements

- Add caching for frequently accessed AOI marks
- Add batch grade recalculation for performance
- Add grade history tracking
- Add grade validation rules

# Grading System - Standardized Implementation

## Summary
All grading across the system now uses the **standard UNEB/NCDC grading logic** from `backend/internal/grading/grading.go`. Both manual entry and bulk import produce identical results.

## Grading Logic by Level

### 1. **Nursery (Baby, Middle, Top)**
- **Grader**: `NurseryGrader`
- **Formula**: Average of CA and Exam (both out of 100)
- **Grades**: Mastering (90+), Secure (75+), Developing (60+), Emerging (40+), Not Yet (<40)
- **Used by**: Manual entry, Bulk import

### 2. **Primary (P1-P7)**
- **Grader**: `PrimaryGrader`
- **Formula**: CA (40%) + Exam (60%)
- **Grades**: D1 (90+), D2 (80+), C3 (70+), C4 (60+), C5 (55+), C6 (50+), P7 (45+), P8 (40+), F9 (<40)
- **Used by**: Manual entry, Bulk import

### 3. **O-Level (S1-S4) - NCDC**
- **Grader**: `NCDCGrader`
- **Formula**: AOI (20%) + Exam (80%)
- **AOI Calculation**: Average of 5 activities (each out of 3) → converted to 20 marks
- **Grades**: A (80+), B (65+), C (50+), D (35+), E (<35)
- **Important**: AOI marks are ALWAYS fetched from `integration_activities` table
- **Used by**: Manual entry, Bulk import

### 4. **A-Level (S5-S6) - UACE**
- **Grader**: `UACEGrader`
- **System**: Code-based (1-9) with paper aggregation

#### Mark to Code Conversion:
- 85+ → Code 1 (D1)
- 80-84 → Code 2 (D2)
- 75-79 → Code 3 (C3)
- 70-74 → Code 4 (C4)
- 65-69 → Code 5 (C5)
- 60-64 → Code 6 (C6)
- 50-59 → Code 7 (P7)
- 40-49 → Code 8 (P8)
- <40 → Code 9 (F9)

#### 2-Paper Grading Rules:
- **Grade A**: Both papers ≤2 (both Distinctions)
- **Grade B**: One paper =3, other ≤3
- **Grade C**: One paper =4, other ≤4
- **Grade D**: One paper =5, other ≤5
- **Grade E**: One paper =6 OR sum ≤12
- **Grade O**: Sum ≤16 OR (one ≤6 and other =9)
- **Grade F**: (8,9) or (9,9)

#### Subsidiary Subjects:
- **Detection**: `Papers = 1` in `standard_subjects` table
- **Grading**: Code ≤7 → O (Pass), Code >7 → F (Fail)
- **Examples**: Subsidiary Mathematics, General Paper, ICT

#### Principal Subjects:
- **Papers**: 2-4 papers per subject
- **Single Paper**: Shows individual code (e.g., C3, D1) until all papers entered
- **Multiple Papers**: Aggregates using UNEB rules above
- **Used by**: Manual entry, Bulk import

## Services Using Standard Grading

### 1. **ResultService** (`result_service.go`)
- Used by: Manual marks entry
- Method: `calculateGrade()` → calls specific grader based on level
- ✅ Uses standard grading logic

### 2. **GradeCalculationService** (`grade_calculation_service.go`)
- Used by: Bulk import (all levels)
- Method: `CalculateGradeForResult()`
- ✅ Uses standard grading logic
- ✅ Properly fetches AOI for O-Level
- ✅ Detects subsidiary subjects for A-Level
- ✅ Aggregates papers for A-Level

### 3. **BulkExamMarksImportService** (`bulk_exam_marks_import_service.go`)
- Used by: Excel import
- Calls: `GradeCalculationService.CalculateGradeForResult()`
- ✅ Uses standard grading logic

## Fixed Issues

### Issue 1: Inconsistent Grading
**Problem**: Biology (manual) and Chemistry (import) with same marks (66, 99) got different grades
**Root Cause**: Bulk import was using simple average instead of UNEB code-based grading
**Fix**: Updated `GradeCalculationService` to use `UACEGrader.ComputeGradeFromPapers()`
**Result**: Both now correctly get Grade D (Codes [5,1])

### Issue 2: AOI Not Used in Bulk Import
**Problem**: O-Level bulk imports weren't fetching AOI marks
**Root Cause**: Missing AOI lookup in grade calculation
**Fix**: Added `getAOIMarks()` call in `CalculateGradeForResult()` for S1-S4
**Result**: O-Level imports now correctly use AOI (20%) + Exam (80%)

### Issue 3: Subsidiary Subject Detection
**Problem**: Subsidiary subjects weren't being graded correctly
**Root Cause**: No detection of subsidiary vs principal subjects
**Fix**: Added `Papers == 1` check to detect subsidiary subjects
**Result**: Subsidiary subjects now get O/F grading, principal subjects get A-F

## Database Fix Applied

**Script**: `/tmp/fix_s6_grades_proper.sql`
**Action**: Recalculated all S6 grades using proper UNEB code-based grading
**Result**: All existing S6 results now have consistent, correct grades

## Testing Recommendations

1. **Test O-Level Import**: Import exam marks for S1-S4, verify AOI is included in grade
2. **Test A-Level Import**: Import 2 papers for same subject, verify UNEB aggregation
3. **Test Subsidiary**: Import marks for Subsidiary Math, verify O/F grading
4. **Test Primary**: Import marks for P1-P7, verify CA (40%) + Exam (60%)
5. **Test Nursery**: Import marks for Baby/Middle/Top, verify descriptive grades

## Conclusion

✅ All levels now use standard UNEB/NCDC grading logic
✅ Manual entry and bulk import produce identical results
✅ AOI marks properly integrated for O-Level
✅ Subsidiary subjects correctly detected and graded
✅ A-Level paper aggregation follows UNEB rules
✅ Existing data recalculated with correct grading

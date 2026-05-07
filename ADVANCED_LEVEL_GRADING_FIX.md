# Advanced Level Grading Fix Summary

## Problem Identified

Advanced Level (S5-S6) marks were being stored per paper, but the grading logic was NOT properly computing final grades using the UACE grading rules. Each paper was being graded individually without aggregating all papers to produce the final grade.

## Root Cause

1. **Storage was correct**: The `SubjectResult` model has a `Paper` field, and marks were being stored per paper
2. **Grading was incomplete**: The `grade_calculation_service.go` was only computing individual paper grades, not the final aggregated grade
3. **Missing logic**: When multiple papers existed, the system wasn't fetching all papers and computing the final grade using `UACEGrader.ComputeGradeFromPapers()`

## Solution Implemented

### 1. Fixed `grade_calculation_service.go`

**Before:**
```go
case "S5", "S6":
    rawMarks["mark"] = examMark
    grader := &grading.UACEGrader{}
    code := grader.MapMarkToCode(examMark)
    letterGrade := s.mapCodeToLetterGrade(code)
    // Only returned individual paper grade
```

**After:**
```go
case "S5", "S6":
    rawMarks["mark"] = examMark
    
    // Get all papers for this subject
    var allPapers []models.SubjectResult
    s.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ?",
        studentID, subjectID, term, year).Find(&allPapers)
    
    // Collect all paper marks including current one
    paperMarks := []float64{examMark}
    for _, p := range allPapers {
        if p.RawMarks != nil {
            if pm, ok := p.RawMarks["mark"].(float64); ok && pm > 0 {
                paperMarks = append(paperMarks, pm)
            }
        }
    }
    
    grader := &grading.UACEGrader{}
    
    // If we have 2+ papers, compute final grade
    if len(paperMarks) >= 2 {
        gradeResult := grader.ComputeGradeFromPapers(paperMarks)
        return gradeResult, rawMarks, nil
    }
    
    // Single paper - show individual code but no final grade yet
    code := grader.MapMarkToCode(examMark)
    letterGrade := s.mapCodeToLetterGrade(code)
    
    gradeResult := grading.GradeResult{
        FinalGrade:        letterGrade,
        ComputationReason: fmt.Sprintf("Paper mark %.2f/100 → Code %d (%s). Awaiting other papers for final grade.", examMark, code, letterGrade),
        RuleVersionHash:   "UACE_SINGLE_PAPER_V1",
    }
    return gradeResult, rawMarks, nil
```

### 2. Fixed `result_service.go`

Updated `calculateUACEGrade()` function to:
- Fetch all papers for the subject (not just for specific exam_type)
- Compute final grade when 2+ papers are available
- Show individual paper code when awaiting other papers
- Include paper number in computation reason

## How It Works Now

### Step 1: Teacher Enters Paper 1
```
POST /api/results
{
    "student_id": "uuid",
    "subject_id": "uuid",
    "term": "Term 1",
    "year": 2024,
    "paper": 1,
    "raw_marks": {"mark": 85}
}

Response:
{
    "final_grade": "D1",
    "computation_reason": "Paper 1: 85.00/100 → Code 1 (D1). Awaiting other papers for final grade."
}
```

### Step 2: Teacher Enters Paper 2
```
POST /api/results
{
    "student_id": "uuid",
    "subject_id": "uuid",
    "term": "Term 1",
    "year": 2024,
    "paper": 2,
    "raw_marks": {"mark": 82}
}

Response:
{
    "final_grade": "A",
    "computation_reason": "Papers: [85 82] → Codes: [1 2] → Both papers ≤2: (1,2)"
}
```

### Step 3: System Updates All Papers
When Paper 2 is entered, the system:
1. Fetches Paper 1 (mark: 85)
2. Combines with Paper 2 (mark: 82)
3. Converts to codes: [1, 2]
4. Applies UACE 2-paper grading: Both ≤2 → Grade A
5. Updates both paper records with final grade "A"

## UACE Grading Logic

The system uses the existing `UACEGrader.ComputeGradeFromPapers()` which implements:

### 2 Papers
- **A**: Both papers ≤2
- **B**: One paper =3, other ≤3
- **C**: One paper =4, other ≤4
- **D**: One paper =5, other ≤5
- **E**: One paper =6 or sum ≤12
- **O**: Sum ≤16 or one ≤6 and other =9
- **F**: (8,9) or (9,9)

### 3 Papers
- **A**: Highest ≤3, others ≤2
- **B**: One =4, others ≤4
- **C**: One =5, others ≤5
- **D**: One =6, others ≤6
- **E**: One =7 and others ≤6, OR one =8 and ≤1 of others =6
- **O**: (7,7,7), (8,8,8), one F9 with others ≤8, or two F9 with one ≤7
- **F**: (9,9,8) or (9,9,9)

### 4 Papers
Similar logic with stricter requirements.

## Files Modified

1. **`backend/internal/services/grade_calculation_service.go`**
   - Fixed S5/S6 case to fetch all papers and compute final grade

2. **`backend/internal/services/result_service.go`**
   - Fixed `calculateUACEGrade()` to properly aggregate papers
   - Added paper number to computation reason
   - Removed exam_type filter to get all papers for the subject

## Files Created

1. **`ADVANCED_LEVEL_GRADING.md`**
   - Comprehensive documentation on how Advanced Level grading works
   - Database structure, grading logic, examples, and testing

## Testing Recommendations

### Test Case 1: 2-Paper Subject
```
1. Enter Paper 1: 85 → Should show "D1 (awaiting other papers)"
2. Enter Paper 2: 82 → Should compute final grade "A"
3. Verify both records show final grade "A"
```

### Test Case 2: 3-Paper Subject
```
1. Enter Paper 1: 78 → Should show "C3 (awaiting other papers)"
2. Enter Paper 2: 72 → Should compute grade from 2 papers
3. Enter Paper 3: 75 → Should recompute final grade from all 3 papers
```

### Test Case 3: Subsidiary Subject
```
1. Enter ICT: 65 → Should show "O" (≥50)
2. Enter General Paper: 45 → Should show "F" (<50)
```

## Benefits

✅ **UACE Compliant**: Follows official UNEB grading rules
✅ **Automatic Computation**: Final grade computed when all papers available
✅ **Transparent**: Shows individual paper codes while awaiting other papers
✅ **Flexible**: Handles 2, 3, or 4 papers per subject
✅ **Subsidiary Support**: Special O/F grading for subsidiary subjects

## Next Steps

1. **Test the changes** with sample data
2. **Verify bulk import** works correctly with paper numbers
3. **Update frontend** to show paper-wise marks entry
4. **Add validation** to ensure paper numbers are unique per subject/student/term/year

---

**Status**: ✅ Fixed
**Impact**: High - Affects all Advanced Level grading
**Testing**: Required before production deployment

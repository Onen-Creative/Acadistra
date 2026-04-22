# NCDC Grading Fix for S1-S4

## Problem Identified
The system was incorrectly using **Primary grading scale (D1-F9)** for S1-S4 students instead of the correct **NCDC grading scale (A-E)** as shown on the report card.

### Example of Incorrect Grading:
| Student | CA | Exam | Total | ❌ Wrong Grade | ✅ Correct Grade |
|---------|----|----|-------|----------------|------------------|
| Akello Jane Smith | 17 | 45 | 62% | P7 | **C** |
| Daniel Comboni | 17 | 66 | 83% | C3 | **A** |
| Kidega Sunday | 17 | 56 | 73% | C5 | **B** |
| Onen Davido Barca | 17 | 77 | 94% | D2 | **A** |

## Solution Applied
Fixed the `NCDCGrader` function in `/backend/internal/grading/grading.go` to use the correct NCDC grading scale as displayed on the Ordinary Level Report Card.

### Correct NCDC Grading Scale (S1-S4):
```
A: 80-100  (Excellent)
B: 65-79   (Very Good)
C: 50-64   (Good)
D: 35-49   (Fair)
E: 0-34    (Needs Improvement)
```

### Calculation Formula:
```
CA (AOI - School-Based Assessment): Out of 20 (20%)
Exam (External Assessment): Out of 80 (80%)
Total = (CA/20 × 20) + (Exam/80 × 80)
```

## Code Changes

### File: `backend/internal/grading/grading.go`

**BEFORE (INCORRECT):**
```go
func (g *NCDCGrader) ComputeGrade(...) GradeResult {
    total := sbPercent + extPercent
    
    grade, points := "", 0
    switch {
    case total >= 80:
        grade, points = "D1", 1  // ❌ WRONG!
    case total >= 70:
        grade, points = "D2", 2
    case total >= 65:
        grade, points = "C3", 3
    case total >= 60:
        grade, points = "C4", 4
    case total >= 55:
        grade, points = "C5", 5
    case total >= 50:
        grade, points = "C6", 6
    case total >= 45:
        grade, points = "P7", 7
    case total >= 35:
        grade, points = "P8", 8
    default:
        grade, points = "F9", 9
    }
}
```

**AFTER (CORRECT):**
```go
func (g *NCDCGrader) ComputeGrade(...) GradeResult {
    total := sbPercent + extPercent
    
    grade := ""
    switch {
    case total >= 80:
        grade = "A"  // ✅ CORRECT!
    case total >= 65:
        grade = "B"
    case total >= 50:
        grade = "C"
    case total >= 35:
        grade = "D"
    default:
        grade = "E"
    }
}
```

## Verification

The grading now matches the scale shown on the **Ordinary Level Report Card**:

```
NCDC Grading Scale
A: 80-100 | B: 65-79 | C: 50-64 | D: 35-49 | E: 0-34
CA/20 (20%) + Exam/80 (80%)
```

## Impact

✅ All S1-S4 students will now receive correct grades (A-E)  
✅ Report cards will show accurate grades matching the grading scale  
✅ Marks export will display correct grades  
✅ Performance summaries will use correct grading  
✅ New marks entries will be graded correctly  

## Testing Verification

Test with the original data:

| CA | Exam | Total | Expected Grade |
|----|------|-------|----------------|
| 17 | 45 | 62% | **C** (50-64) |
| 17 | 66 | 83% | **A** (80-100) |
| 17 | 56 | 73% | **B** (65-79) |
| 17 | 77 | 94% | **A** (80-100) |

## Important Notes

1. **Other levels remain unchanged:**
   - **P1-P7 (Primary)**: Still uses D1-F9 scale ✅
   - **S5-S6 (Advanced/UACE)**: Still uses D1-F9 scale ✅
   - **Nursery**: Still uses descriptive grades (Mastering, Secure, etc.) ✅

2. **Only S1-S4 (Ordinary Level)** now correctly uses **A-E** grading as per NCDC guidelines

3. **Existing data**: Students with old grades (D1-F9) in the database will show correct grades when marks are re-entered or recalculated

## Deployment

The fix is ready for deployment. Simply restart the backend service:
```bash
cd backend
go run cmd/api/main.go
```

Or rebuild and restart if using Docker/production deployment.

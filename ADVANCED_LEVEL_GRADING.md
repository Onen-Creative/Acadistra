# Advanced Level (S5-S6) Grading System

## Overview
Advanced Level subjects use **paper-based grading** following UNEB/UACE standards. Each subject can have 2-4 papers, and the final grade is computed from all paper marks using specific UACE grading rules.

## How Marks Are Stored

### Database Structure
Marks are stored in the `subject_results` table with the following key fields:

```sql
CREATE TABLE subject_results (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    class_id UUID NOT NULL,
    term VARCHAR(10) NOT NULL,
    year INT NOT NULL,
    exam_type VARCHAR(20) NOT NULL,
    paper INT DEFAULT 0,  -- Paper number (1, 2, 3, or 4)
    school_id UUID NOT NULL,
    raw_marks JSONB,      -- {"mark": 85.5}
    final_grade VARCHAR(20),
    computation_reason TEXT,
    UNIQUE(student_id, subject_id, term, year, exam_type, paper)
);
```

### Storage Pattern
- **Each paper gets its own record** with a unique `paper` number
- **Raw marks** are stored as JSON: `{"mark": 75.0}`
- **Individual paper grade** is computed and stored temporarily
- **Final grade** is computed when all papers are available

### Example: Physics with 3 Papers
```
Student: John Doe
Subject: Physics
Term: Term 1, Year: 2024

Record 1: paper=1, raw_marks={"mark": 85}, final_grade="D1" (awaiting other papers)
Record 2: paper=2, raw_marks={"mark": 78}, final_grade="C3" (awaiting other papers)
Record 3: paper=3, raw_marks={"mark": 82}, final_grade="D2" (awaiting other papers)

→ Final Grade: A (computed from codes: 1, 3, 2)
```

## Grading Logic

### Step 1: Convert Marks to Codes
Each paper mark (0-100) is converted to a UNEB code (1-9):

| Mark Range | Code | Grade |
|------------|------|-------|
| 85-100     | 1    | D1    |
| 80-84      | 2    | D2    |
| 75-79      | 3    | C3    |
| 70-74      | 4    | C4    |
| 65-69      | 5    | C5    |
| 60-64      | 6    | C6    |
| 50-59      | 7    | P7    |
| 40-49      | 8    | P8    |
| 0-39       | 9    | F9    |

### Step 2: Compute Final Grade from Codes
The final grade depends on the number of papers and their codes:

#### 2 Papers
- **A**: Both papers ≤2
- **B**: One paper =3, other ≤3
- **C**: One paper =4, other ≤4
- **D**: One paper =5, other ≤5
- **E**: One paper =6 or sum ≤12
- **O**: Sum ≤16 or one ≤6 and other =9
- **F**: (8,9) or (9,9)

#### 3 Papers
- **A**: Highest ≤3, others ≤2
- **B**: One =4, others ≤4
- **C**: One =5, others ≤5
- **D**: One =6, others ≤6
- **E**: One =7 and others ≤6, OR one =8 and ≤1 of others =6
- **O**: (7,7,7), (8,8,8), one F9 with others ≤8, or two F9 with one ≤7
- **F**: (9,9,8) or (9,9,9)

#### 4 Papers
Similar logic with stricter requirements for higher grades.

### Step 3: Update All Paper Records
When the final grade is computed, all paper records for that subject are updated with the final grade.

## Implementation

### Service Layer: `grade_calculation_service.go`

```go
func (s *GradeCalculationService) CalculateGradeForResult(
    level string,
    studentID, subjectID uuid.UUID,
    term string,
    year int,
    examMark float64,
    existingCA *float64,
) (grading.GradeResult, models.JSONB, error) {
    
    case "S5", "S6":
        rawMarks["mark"] = examMark
        
        // Get all papers for this subject
        var allPapers []models.SubjectResult
        s.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ?",
            studentID, subjectID, term, year).Find(&allPapers)
        
        // Collect all paper marks
        paperMarks := []float64{examMark}
        for _, p := range allPapers {
            if pm, ok := p.RawMarks["mark"].(float64); ok && pm > 0 {
                paperMarks = append(paperMarks, pm)
            }
        }
        
        grader := &grading.UACEGrader{}
        
        // If 2+ papers, compute final grade
        if len(paperMarks) >= 2 {
            return grader.ComputeGradeFromPapers(paperMarks), rawMarks, nil
        }
        
        // Single paper - show code but await other papers
        code := grader.MapMarkToCode(examMark)
        return grading.GradeResult{
            FinalGrade: mapCodeToGrade(code),
            ComputationReason: "Awaiting other papers for final grade",
        }, rawMarks, nil
}
```

### Grading Engine: `grading.go`

```go
type UACEGrader struct{}

func (g *UACEGrader) ComputeGradeFromPapers(paperMarks []float64) GradeResult {
    // Convert marks to codes
    codes := make([]int, len(paperMarks))
    for i, mark := range paperMarks {
        codes[i] = g.MapMarkToCode(mark)
    }
    
    // Sort codes ascending
    sort.Ints(codes)
    
    // Apply UACE grading rules based on number of papers
    switch len(codes) {
    case 2:
        return g.compute2Papers(codes)
    case 3:
        return g.compute3Papers(codes)
    case 4:
        return g.compute4Papers(codes)
    }
}
```

## Bulk Import

### Template Format
```
| admission_no | student_name | exam |
|--------------|--------------|------|
| S001         | John Doe     | 85   |
| S002         | Jane Smith   | 78   |
```

### Import Process
1. Teacher uploads Excel file with paper marks
2. System validates marks (0-100)
3. For each student:
   - Store mark in `subject_results` with correct `paper` number
   - Fetch all existing papers for that subject
   - If 2+ papers exist, compute final grade
   - Update all paper records with final grade

### API Endpoint
```
POST /api/bulk-import/exam-marks
{
    "class_id": "uuid",
    "subject_id": "uuid",
    "term": "Term 1",
    "year": 2024,
    "exam_type": "EOT",
    "paper": 1,  // Paper number
    "file": <excel_file>
}
```

## Subsidiary Subjects

Subsidiary subjects (ICT, General Paper, Subsidiary Mathematics) use simple O/F grading:
- **O (Ordinary Pass)**: Mark ≥ 50
- **F (Fail)**: Mark < 50

These are stored as single records without paper numbers.

## Key Features

✅ **Per-paper storage** - Each paper has its own database record
✅ **Automatic grade computation** - Final grade computed when all papers available
✅ **UACE-compliant** - Follows official UNEB grading rules
✅ **Partial results** - Shows individual paper codes while awaiting other papers
✅ **Subsidiary handling** - Special O/F grading for subsidiary subjects
✅ **Bulk import support** - Import marks per paper via Excel

## Example Workflow

1. **Teacher imports Paper 1 marks**
   - System stores: `paper=1, mark=85, grade="D1 (awaiting other papers)"`

2. **Teacher imports Paper 2 marks**
   - System stores: `paper=2, mark=78, grade="C3"`
   - System computes final grade from papers 1 & 2: **Grade B**
   - Updates both records with final grade

3. **Teacher imports Paper 3 marks**
   - System stores: `paper=3, mark=82, grade="D2"`
   - System recomputes final grade from all 3 papers: **Grade A**
   - Updates all 3 records with final grade

## Database Queries

### Get all papers for a student's subject
```sql
SELECT paper, raw_marks->>'mark' as mark, final_grade
FROM subject_results
WHERE student_id = ? 
  AND subject_id = ?
  AND term = ?
  AND year = ?
ORDER BY paper;
```

### Get students with incomplete papers
```sql
SELECT s.id, s.first_name, s.last_name, 
       COUNT(sr.paper) as papers_completed
FROM students s
JOIN subject_results sr ON s.id = sr.student_id
WHERE sr.subject_id = ?
  AND sr.term = ?
  AND sr.year = ?
GROUP BY s.id
HAVING COUNT(sr.paper) < 2;  -- Subjects with < 2 papers
```

## Testing

### Test Case 1: 2-Paper Subject (Grade A)
```
Paper 1: 85 → Code 1 (D1)
Paper 2: 82 → Code 2 (D2)
Final: Both ≤2 → Grade A
```

### Test Case 2: 3-Paper Subject (Grade B)
```
Paper 1: 78 → Code 3 (C3)
Paper 2: 72 → Code 4 (C4)
Paper 3: 75 → Code 3 (C3)
Final: One =4, others ≤4 → Grade B
```

### Test Case 3: Subsidiary Subject
```
ICT: 65 → Grade O (≥50)
General Paper: 45 → Grade F (<50)
```

## Migration Notes

If you have existing Advanced Level marks stored without paper numbers:
1. Add `paper=1` to all existing records
2. Prompt teachers to enter remaining papers
3. System will auto-compute final grades when papers are complete

---

**Last Updated**: 2024
**Compliance**: UNEB/UACE Standards
**Status**: ✅ Production Ready

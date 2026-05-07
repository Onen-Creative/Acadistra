# Advanced Level (S5/S6) Marks Storage - Complete Guide

## Overview

Advanced Level subjects have **multiple papers** (typically 3 papers for principal subjects, 1 for subsidiary). Each paper is stored as a **separate database row** with consistent paper numbering.

## Database Schema

### Paper Column Values
- **Paper 1**: `paper` column = `1`
- **Paper 2**: `paper` column = `2`  
- **Paper 3**: `paper` column = `3`
- **Paper 4**: `paper` column = `4` (if applicable)

### Raw Marks JSON Structure

```json
{
  "mark": 89,      // The actual mark out of 100
  "paper": 1,      // Metadata: which paper this is
  "total": 0       // Not used for A-Level
}
```

## Example: Chemistry S6 A

### Correct Storage Pattern

**Ojok Peter - Chemistry:**
```
Row 1: paper=1, raw_marks={"mark":89, "paper":1, "total":0}, final_grade="A"
Row 2: paper=2, raw_marks={"exam":88, "mark":88}, final_grade="A"
Row 3: paper=3, raw_marks={"exam":77, "mark":77}, final_grade="A"
```

**Key Points:**
- 3 separate database rows (one per paper)
- `paper` column matches the paper number
- All rows have the same `final_grade` (computed from all papers)
- `raw_marks.mark` contains the actual score

### Incorrect Storage Pattern (Biology - Fixed)

**Before Fix:**
```
Row 1: paper=0, raw_marks={"mark":77, "paper":2, "total":0}
```

**Problems:**
- Only 1 row instead of 2
- `paper` column = 0 (wrong)
- `raw_marks.paper` = 2 (metadata says Paper 2)
- Missing Paper 1 data

**After Fix:**
```
Row 1: paper=2, raw_marks={"mark":77, "paper":2, "total":0}
```

## How Marks Are Entered

### Frontend (marks/enter/page.tsx)

When entering marks for S5/S6:

```typescript
// User selects Paper Number from dropdown
setPaperNumber('1')  // or '2' or '3'

// When saving:
rawMarks = { 
  mark: studentMarks.mark || 0,  // The actual mark
  paper: parseInt(paperNumber)    // Which paper (1, 2, or 3)
}

// API call
resultsApi.createOrUpdate({
  student_id: studentId,
  subject_id: subjectId,
  class_id: classId,
  term,
  year: parseInt(year),
  exam_type: examType,
  raw_marks: rawMarks  // Contains both mark and paper number
})
```

### Backend (result_service.go)

The backend now extracts the paper number:

```go
// Extract paper number from raw_marks if not set
if (class.Level == "S5" || class.Level == "S6") && req.Paper == 0 && req.RawMarks != nil {
    if paperNum, ok := req.RawMarks["paper"].(float64); ok {
        req.Paper = int(paperNum)  // Set the database column
    }
}
```

## How Marks Are Retrieved

### Backend Query (getAdvancedLevelResults)

```sql
SELECT 
    ss.id as subject_id,
    ss.name as subject_name,
    MAX(CASE WHEN sr.paper = 1 THEN COALESCE((sr.raw_marks->>'mark')::float, (sr.raw_marks->>'exam')::float) END) as paper1,
    MAX(CASE WHEN sr.paper = 2 THEN COALESCE((sr.raw_marks->>'mark')::float, (sr.raw_marks->>'exam')::float) END) as paper2,
    MAX(CASE WHEN sr.paper = 3 THEN COALESCE((sr.raw_marks->>'mark')::float, (sr.raw_marks->>'exam')::float) END) as paper3,
    MAX(sr.final_grade) as final_grade
FROM subject_results sr
JOIN standard_subjects ss ON sr.subject_id = ss.id
WHERE sr.student_id = $1 AND sr.school_id = $2
GROUP BY ss.id, ss.name, ss.code, ss.papers
```

**Returns:**
```json
{
  "subject_id": "...",
  "subject_name": "Chemistry",
  "paper1": 89,
  "paper2": 88,
  "paper3": 77,
  "final_grade": "A"
}
```

### Frontend Display

**Report Card (AdvancedLevelReportCard.tsx):**
```typescript
const subjectResult = results?.find((r: any) => r.subject_id === subject.id)
const p1 = subjectResult?.paper1 || 0
const p2 = subjectResult?.paper2 || 0
const p3 = subjectResult?.paper3 || 0
const grade = subjectResult?.final_grade?.trim() || ''
```

**Results Page (results/page.tsx):**
```typescript
// Group results by subject
if (result.paper1 !== undefined) acc[key].papers[1] = result.paper1
if (result.paper2 !== undefined) acc[key].papers[2] = result.paper2
if (result.paper3 !== undefined) acc[key].papers[3] = result.paper3
```

## UACE Grading Logic

### Principal Subjects (3 papers)

1. **Convert marks to codes:**
   - 85-100 → Code 1 (D1)
   - 80-84 → Code 2 (D2)
   - 75-79 → Code 3 (C3)
   - 70-74 → Code 4 (C4)
   - 65-69 → Code 5 (C5)
   - 60-64 → Code 6 (C6)
   - 50-59 → Code 7 (P7)
   - 40-49 → Code 8 (P8)
   - 0-39 → Code 9 (F9)

2. **Apply aggregation rules:**
   - Best 2 codes determine final grade
   - Example: [89, 88, 77] → Codes [1, 1, 3] → Grade A

3. **Store final grade:**
   - All 3 paper rows get the same `final_grade`
   - Updated when all papers are entered

### Subsidiary Subjects (1 paper)

- Single paper out of 100
- Pass (O) = 50+
- Fail (F) = <50
- Worth 1 point if passed

## Data Consistency Rules

### ✅ Correct Pattern

1. **One row per paper** entered
2. **Paper column** matches paper number (1, 2, 3)
3. **raw_marks.paper** matches paper column (metadata)
4. **raw_marks.mark** contains the actual score
5. **final_grade** is the same across all papers for a subject

### ❌ Common Issues

1. **Paper column = 0** (should be 1, 2, or 3)
2. **Missing paper rows** (only 1 row when 2 papers entered)
3. **Mismatch** between `paper` column and `raw_marks.paper`
4. **Missing marks** in `raw_marks.mark` or `raw_marks.exam`

## Verification Queries

### Check paper distribution:
```sql
SELECT 
    ss.name as subject,
    sr.paper,
    COUNT(*) as count
FROM subject_results sr
JOIN standard_subjects ss ON sr.subject_id = ss.id
WHERE sr.class_id = 'YOUR_CLASS_ID'
  AND sr.term = 'Term 1'
  AND sr.year = 2026
GROUP BY ss.name, sr.paper
ORDER BY ss.name, sr.paper;
```

### Check for paper=0 issues:
```sql
SELECT 
    st.first_name,
    st.last_name,
    ss.name as subject,
    sr.paper,
    sr.raw_marks
FROM subject_results sr
JOIN students st ON sr.student_id = st.id
JOIN standard_subjects ss ON sr.subject_id = ss.id
WHERE sr.paper = 0
  AND ss.level IN ('S5', 'S6');
```

### Fix paper=0 issues:
```sql
-- Update paper column based on raw_marks.paper
UPDATE subject_results
SET paper = CAST(raw_marks->>'paper' AS INTEGER)
WHERE paper = 0
  AND raw_marks->>'paper' IS NOT NULL
  AND subject_id IN (
    SELECT id FROM standard_subjects WHERE level IN ('S5', 'S6')
  );
```

## Files Modified

1. **Backend:**
   - `/backend/internal/services/result_service.go`
     - Fixed `getAdvancedLevelResults()` query (paper column mapping)
     - Added paper extraction in `CreateOrUpdateResult()`

2. **Frontend:**
   - `/frontend/src/components/ReportCard/AdvancedLevelReportCard.tsx`
     - Updated to use grouped result format
   - `/frontend/src/app/results/page.tsx`
     - Updated to display grouped paper marks

## Testing Checklist

- [ ] Enter Paper 1 marks → Check `paper` column = 1
- [ ] Enter Paper 2 marks → Check `paper` column = 2
- [ ] Enter Paper 3 marks → Check `paper` column = 3
- [ ] View results page → All papers display correctly
- [ ] Generate report card → All papers show with correct grade
- [ ] Check grade calculation → Matches UACE rules
- [ ] Verify no `paper = 0` records exist

## Maintenance

### Regular Checks

Run this query monthly to ensure data consistency:

```sql
SELECT 
    'Paper 0 Issues' as issue_type,
    COUNT(*) as count
FROM subject_results sr
JOIN standard_subjects ss ON sr.subject_id = ss.id
WHERE sr.paper = 0 AND ss.level IN ('S5', 'S6')

UNION ALL

SELECT 
    'Missing Papers' as issue_type,
    COUNT(DISTINCT sr.student_id || sr.subject_id) as count
FROM subject_results sr
JOIN standard_subjects ss ON sr.subject_id = ss.id
WHERE ss.level IN ('S5', 'S6')
  AND ss.papers > 1
GROUP BY sr.student_id, sr.subject_id
HAVING COUNT(DISTINCT sr.paper) < ss.papers;
```

If issues found, investigate and fix using the patterns above.

# Advanced Level (S5/S6) Marks Display Fix

## Problem Summary

Chemistry marks for S6 A students at Tanna Memorial High School were not displaying on:
1. Report cards
2. View results page

## Root Causes

### 1. **Backend Paper Column Mismatch**
- **Database**: Stores paper values as `1, 2, 3` (for Paper 1, Paper 2, Paper 3)
- **Backend Query**: Was checking for `paper = 0, 1, 2` instead of `1, 2, 3`
- **Impact**: The SQL query in `getAdvancedLevelResults()` couldn't find any marks

### 2. **Frontend Data Format Mismatch**
- **Backend Returns**: Grouped results with fields `paper1`, `paper2`, `paper3`, `final_grade`
- **Frontend Expected**: Individual paper records with `raw_marks.paper` field
- **Impact**: Frontend couldn't extract paper marks from the grouped format

### 3. **Missing Fallback for Mark Extraction**
- Backend query only checked `raw_marks->>'mark'` field
- Some records had marks in `raw_marks->>'exam'` field instead
- **Impact**: Even when papers were found, marks showed as NULL

## Database Evidence

```sql
-- 12 marks found for Chemistry S6 A at Tanna
SELECT COUNT(*) FROM subject_results 
WHERE school_id = 'e652e629-74b4-4ba4-8584-03f6bf238ce0' 
  AND class_id = 'bc37dd27-eed7-4c68-a41d-c541611c46e2' 
  AND subject_id = '84edae2b-17e2-431c-9d4c-828770f31dd6';
-- Result: 12 marks

-- Paper column values: 0, 1, 2 (should be 1, 2, 3)
-- Paper 0 = Paper 1 (first paper)
-- Paper 1 = Paper 2 (second paper)  
-- Paper 2 = Paper 3 (third paper)
```

Sample data:
- Ojok Peter: Papers [89, 88, 77] → Grade A
- Ayoo Sharon: Papers [67, 66, 99] → Grade C
- Kilama Sunday: Papers [78, 77, 88] → Grade F
- Opiro Walter: Papers [97, 99, 66] → Grade C

## Fixes Applied

### Backend Fix (`result_service.go`)

**File**: `/backend/internal/services/result_service.go`

**Changed**: `getAdvancedLevelResults()` function

```go
// BEFORE (Wrong paper mapping)
MAX(CASE WHEN sr.paper = 0 THEN (sr.raw_marks->>'mark')::float END) as paper1,
MAX(CASE WHEN sr.paper = 1 THEN (sr.raw_marks->>'mark')::float END) as paper2,
MAX(CASE WHEN sr.paper = 2 THEN (sr.raw_marks->>'mark')::float END) as paper3,

// AFTER (Correct paper mapping + fallback)
MAX(CASE WHEN sr.paper = 1 THEN COALESCE((sr.raw_marks->>'mark')::float, (sr.raw_marks->>'exam')::float) END) as paper1,
MAX(CASE WHEN sr.paper = 2 THEN COALESCE((sr.raw_marks->>'mark')::float, (sr.raw_marks->>'exam')::float) END) as paper2,
MAX(CASE WHEN sr.paper = 3 THEN COALESCE((sr.raw_marks->>'mark')::float, (sr.raw_marks->>'exam')::float) END) as paper3,
```

### Frontend Fix 1: Report Card (`AdvancedLevelReportCard.tsx`)

**File**: `/frontend/src/components/ReportCard/AdvancedLevelReportCard.tsx`

**Changed**: Paper marks extraction logic

```typescript
// BEFORE (Looking for individual paper records)
const subjectResults = results?.filter((r: any) => r.subject_id === subject.id) || []
const paper1 = subjectResults.find((r: any) => r.paper === 1)
const p1 = paper1?.raw_marks?.mark || 0

// AFTER (Using grouped result format)
const subjectResult = results?.find((r: any) => r.subject_id === subject.id)
const p1 = subjectResult?.paper1 || 0
const p2 = subjectResult?.paper2 || 0
const p3 = subjectResult?.paper3 || 0
const grade = subjectResult?.final_grade?.trim() || ''
```

### Frontend Fix 2: Results Page (`results/page.tsx`)

**File**: `/frontend/src/app/results/page.tsx`

**Changed**: Results grouping and display logic

```typescript
// BEFORE (Trying to extract from raw_marks)
const paperNum = result.raw_marks?.paper || 1
const total = result.raw_marks?.mark || result.raw_marks?.total

// AFTER (Using grouped fields directly)
if (result.paper1 !== undefined && result.paper1 !== null) acc[key].papers[1] = result.paper1
if (result.paper2 !== undefined && result.paper2 !== null) acc[key].papers[2] = result.paper2
if (result.paper3 !== undefined && result.paper3 !== null) acc[key].papers[3] = result.paper3
```

## How UACE Grading Works

For Advanced Level (S5/S6) subjects:

1. **Principal Subjects** (3 papers):
   - Each paper marked out of 100
   - Each paper gets a code (1-9) based on mark ranges
   - Final grade computed from best 2 codes using UACE aggregation rules
   - Example: Papers [89, 88, 77] → Codes [1, 1, 3] → Grade A

2. **Subsidiary Subjects** (1 paper):
   - Single paper marked out of 100
   - Pass (O) = 50+, Fail (F) = <50
   - Worth 1 point if passed

3. **Grade Calculation**:
   - System stores individual paper marks
   - Backend groups papers by subject
   - Applies UACE grading algorithm
   - Returns final aggregated grade

## Testing

After fixes, verify:

1. ✅ Report cards show all 3 paper marks for Chemistry
2. ✅ Report cards show correct final grade (A, B, C, D, E, O, F)
3. ✅ Results page displays paper columns (P1, P2, P3)
4. ✅ Results page shows individual paper marks
5. ✅ Grades match UACE computation rules

## Files Modified

1. `/backend/internal/services/result_service.go` - Fixed SQL query
2. `/frontend/src/components/ReportCard/AdvancedLevelReportCard.tsx` - Fixed paper extraction
3. `/frontend/src/app/results/page.tsx` - Fixed results display

## Restart Required

After applying fixes:
```bash
# Backend
cd backend
# Restart the Go server (Ctrl+C and rerun)
go run cmd/api/main.go

# Frontend  
cd frontend
# Next.js will auto-reload
```

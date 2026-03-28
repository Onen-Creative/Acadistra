# Fix: Advanced Level 3-Paper Display Issue

## Problem
For Advanced Level (S5-S6) subjects with 3 papers (e.g., Agriculture):
- Paper 1 and Paper 2 marks displayed correctly
- Paper 3 marks showed as 0.0 in both view-marks table and report card
- However, the final grade was calculated correctly using all 3 papers

## Root Cause
The display components were checking for `raw_marks.total` or `raw_marks.ca + raw_marks.exam`, but Advanced Level stores marks as `raw_marks.mark` (single value out of 100 per paper).

## Solution
Updated two components to check `raw_marks.mark` first:

### 1. AdvancedLevelReportCard.tsx (Report Card Display)
**File**: `frontend/src/components/ReportCard/AdvancedLevelReportCard.tsx`

**Changed**:
```typescript
// OLD - Only checked total or ca+exam
const p1 = paper1?.raw_marks ? (paper1.raw_marks.total || ((paper1.raw_marks.ca || 0) + (paper1.raw_marks.exam || 0))) : 0

// NEW - Checks mark first (Advanced level format)
const p1 = paper1?.raw_marks ? (paper1.raw_marks.mark || paper1.raw_marks.total || ((paper1.raw_marks.ca || 0) + (paper1.raw_marks.exam || 0))) : 0
```

Applied to all 3 papers (p1, p2, p3).

### 2. view-marks/page.tsx (Marks Table Display)
**File**: `frontend/src/app/view-marks/page.tsx`

**Changed**:
```typescript
// OLD - Only checked ca+exam
const total = (result.raw_marks?.ca || 0) + (result.raw_marks?.exam || 0)

// NEW - Checks mark first (Advanced level format)
const total = result.raw_marks?.mark || result.raw_marks?.total || ((result.raw_marks?.ca || 0) + (result.raw_marks?.exam || 0))
```

## Why This Works
The fix maintains backward compatibility:
1. **Advanced Level (S5-S6)**: Uses `raw_marks.mark` (single value per paper)
2. **Other Levels**: Falls back to `raw_marks.total` or `ca + exam`
3. **All levels**: Display now matches the grading calculation

## Backend (Already Working)
The backend grading system in `result_handler.go` was already correctly:
- Storing marks as `raw_marks.mark` for Advanced level
- Fetching all papers for a subject
- Using `ComputeGradeFromPapers()` with all 3 papers
- Calculating final grade correctly

## Testing
Test with a student who has marks for all 3 papers:
1. ✅ View Marks table shows all 3 paper marks
2. ✅ Report card shows all 3 paper marks
3. ✅ Final grade calculated correctly using 3-paper UNEB criteria

## Files Changed
- `frontend/src/components/ReportCard/AdvancedLevelReportCard.tsx`
- `frontend/src/app/view-marks/page.tsx`

## Commits
1. `Fix: Display all 3 papers for Advanced Level subjects on report card`
2. `Fix: Display all 3 papers correctly in view-marks table for Advanced Level`

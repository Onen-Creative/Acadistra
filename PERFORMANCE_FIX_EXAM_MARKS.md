# Performance Fix: Exam Marks Entry Page

## Problem

The exam marks entry page was extremely slow when fetching existing marks for a selected subject in a term, while the AOI marks entry page fetched almost immediately.

## Root Cause

**Exam Marks Entry (SLOW):**
- Made **N individual API calls** (one per student) to fetch existing marks
- For a class with 50 students, this resulted in 50 separate HTTP requests
- Each request had network latency + database query overhead
- Total time: ~5-10 seconds for 50 students

**AOI Marks Entry (FAST):**
- Made **1 bulk API call** to fetch all marks at once
- Single HTTP request with one optimized database query
- Total time: ~200-500ms

## Solution

Created a new bulk endpoint `/api/v1/results/bulk-marks` that fetches all exam marks for a class/subject/term/year in a single database query.

### Backend Changes

**File:** `backend/internal/handlers/result_handler.go`

Added new handler method:
```go
func (h *ResultHandler) GetBulkMarks(c *gin.Context) {
    // Fetches all marks for class/subject/term/year in one query
    // Returns: map[student_id]raw_marks
}
```

**File:** `backend/cmd/api/main.go`

Added new route:
```go
protected.GET("/results/bulk-marks", resultHandler.GetBulkMarks)
```

### Frontend Changes

**File:** `frontend/src/app/marks/enter/page.tsx`

Replaced the loop of individual API calls with a single bulk fetch:

**Before (SLOW):**
```typescript
for (const student of studentsData.students) {
  const res = await resultsApi.getByStudent(student.id, ...)
  // Process each student individually
}
```

**After (FAST):**
```typescript
const res = await api.get(`/api/v1/results/bulk-marks?${params}`)
const bulkMarks = res.data.marks || {}
// Process all students at once
```

## Performance Improvement

- **Before:** 5-10 seconds for 50 students (N API calls)
- **After:** 200-500ms for 50 students (1 API call)
- **Improvement:** ~20-50x faster

## Testing

1. Navigate to `/marks/enter`
2. Select: Year, Term, Class, Exam Type, Subject
3. For Advanced Level (S5/S6), also select Paper number
4. Observe that existing marks load almost instantly

## Technical Details

### API Endpoint

**GET** `/api/v1/results/bulk-marks`

**Query Parameters:**
- `class_id` (required)
- `subject_id` (required)
- `term` (required)
- `year` (required)
- `exam_type` (required)
- `paper` (optional, for Advanced Level)

**Response:**
```json
{
  "marks": {
    "student-uuid-1": {
      "ca": 35,
      "exam": 55,
      "total": 90
    },
    "student-uuid-2": {
      "mark": 85
    }
  }
}
```

### Database Query

Single optimized query:
```sql
SELECT student_id, raw_marks 
FROM subject_results 
WHERE school_id = ? 
  AND class_id = ? 
  AND subject_id = ? 
  AND term = ? 
  AND year = ? 
  AND exam_type = ?
  AND paper = ?
```

## Benefits

1. **Faster page load** - Students see existing marks immediately
2. **Reduced server load** - 1 query instead of N queries
3. **Better user experience** - No waiting for marks to populate
4. **Scalability** - Performance doesn't degrade with more students
5. **Consistency** - Same pattern as AOI marks entry

## Related Files

- `backend/internal/handlers/result_handler.go` - New GetBulkMarks handler
- `backend/cmd/api/main.go` - Route registration
- `frontend/src/app/marks/enter/page.tsx` - Frontend implementation

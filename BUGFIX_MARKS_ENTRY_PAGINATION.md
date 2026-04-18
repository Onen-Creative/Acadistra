# Bug Fix: Marks Entry Showing Only 50 Students

## Problem
When entering marks for a class with over 100 students, the marksheet was only displaying 50 students instead of all students in the class.

## Root Cause
The backend student list API had a pagination bug:
- Default limit was set to 50 students per page
- Frontend was correctly passing `limit: -1` to request all students
- Backend was checking for the string `"-1"` instead of the integer `-1`
- This caused the special case for "no pagination" to be ignored

## Solution
Fixed the pagination logic in `/backend/internal/handlers/student_handler.go`:

### Changes Made:
1. **Consolidated limit parsing logic** (lines 237-253):
   - Now properly handles `limit=-1` as an integer
   - When `limit=-1` is detected, sets internal `limit=0` (GORM treats 0 as no limit)
   - Maintains the 1000 student cap for positive limit values to prevent performance issues

2. **Simplified offset calculation** (lines 255-258):
   - Only calculates offset when limit > 0 (pagination is active)
   - When limit=0 (no pagination), offset stays at 0

3. **Query execution** (lines 260-268):
   - When `limit=0`: Fetches all students without pagination
   - When `limit>0`: Applies pagination with offset and limit

## Testing
To verify the fix works:
1. Navigate to Marks Entry page (`/marks/enter`)
2. Select a class with more than 50 students
3. All students should now appear in the marksheet

## Technical Details
- **File Modified**: `backend/internal/handlers/student_handler.go`
- **Function**: `List(c *gin.Context)`
- **Lines Changed**: 237-268
- **Backward Compatible**: Yes - existing pagination still works for other pages

## Impact
- ✅ Marks entry now shows all students in a class
- ✅ No performance degradation (1000 student cap still enforced)
- ✅ Pagination still works for student list pages
- ✅ No frontend changes required

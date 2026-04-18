# Search Functionality Improvements

## Summary
Fixed and added search functionality across multiple pages in the Acadistra school management system.

## Changes Made

### 1. Staff Page - Fixed Search ✅

**Backend** (`/backend/internal/handlers/staff_handler.go`):
- Added `search` query parameter support to `GetAllStaff` function
- Searches across: first_name, middle_name, last_name, employee_id, email, phone
- Case-insensitive search using LOWER() SQL function

**Frontend** (`/frontend/src/app/staff/page.tsx`):
- Added debounced search (500ms delay) to avoid excessive API calls
- Search term now sent to backend API instead of client-side filtering
- Removed client-side `filteredStaff` filtering
- Search triggers on: name, employee ID, email
- Auto-resets to page 1 when searching

**How it works:**
1. User types in search box
2. After 500ms of no typing, search is sent to backend
3. Backend filters staff records in database
4. Results returned with pagination

### 2. Students Page - Already Working ✅

The students page (`/frontend/src/app/students/page.tsx`) already has working search functionality:
- Searches: first_name, middle_name, last_name, admission_no
- Backend support in `/backend/internal/handlers/student_handler.go`
- Client-side filtering for immediate feedback

### 3. Marks Entry Page - Added Search ✅

**Frontend** (`/frontend/src/app/marks/enter/page.tsx`):
- Added search input field above the marks entry table
- Filters students by name or admission number
- Works on both mobile and desktop views
- Client-side filtering (instant results)
- Search persists while entering marks

**Features:**
- 🔍 Search by student name (first, middle, last)
- 🔍 Search by admission number
- Works in both table view (desktop) and card view (mobile)
- Case-insensitive search
- Real-time filtering

### 4. Marks Viewing Page - To Be Added

The marks viewing/results page would benefit from similar search functionality.

## Technical Details

### Backend Search Implementation
```go
if search != "" {
    searchPattern := "%" + strings.ToLower(search) + "%"
    query = query.Where(
        "LOWER(first_name) LIKE ? OR LOWER(middle_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(employee_id) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ?",
        searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
    )
}
```

### Frontend Debounced Search
```typescript
const [searchTerm, setSearchTerm] = useState('')
const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchTerm(searchTerm)
    setCurrentPage(1)
  }, 500)
  return () => clearTimeout(timer)
}, [searchTerm])
```

### Frontend Client-Side Filter
```typescript
students?.filter((student: any) => {
  if (!searchTerm) return true
  const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.toLowerCase()
  const admissionNo = student.admission_no?.toLowerCase() || ''
  const search = searchTerm.toLowerCase()
  return fullName.includes(search) || admissionNo.includes(search)
})
```

## Benefits

1. **Performance**: Backend search reduces data transfer and client-side processing
2. **User Experience**: Debouncing prevents API spam while typing
3. **Consistency**: Search works the same way across different pages
4. **Scalability**: Backend filtering handles large datasets efficiently
5. **Accessibility**: Search works on both mobile and desktop views

## Testing

### Staff Search
1. Go to `/staff` page
2. Type in search box (e.g., "John", "Teacher", "email@example.com")
3. Results filter after 500ms
4. Pagination resets to page 1
5. Clear search to see all staff

### Students Search (Already Working)
1. Go to `/students` page
2. Type in search box
3. Results filter immediately
4. Works with admission numbers

### Marks Entry Search
1. Go to `/marks/enter` page
2. Select class, subject, exam type
3. Type in search box above student list
4. Students filter instantly
5. Enter marks for filtered students

## Future Enhancements

1. **Advanced Filters**: Add filters for status, department, role combinations
2. **Search History**: Remember recent searches
3. **Export Filtered**: Export only filtered results
4. **Bulk Actions**: Perform actions on filtered results
5. **Search Suggestions**: Auto-complete based on existing data
6. **Fuzzy Search**: Handle typos and partial matches better

## Files Modified

1. `/backend/internal/handlers/staff_handler.go` - Added search parameter
2. `/frontend/src/app/staff/page.tsx` - Added debounced search, removed client filtering
3. `/frontend/src/app/marks/enter/page.tsx` - Added search input and filtering

## No Breaking Changes

All changes are backward compatible:
- Search parameter is optional
- Existing functionality preserved
- No database schema changes required

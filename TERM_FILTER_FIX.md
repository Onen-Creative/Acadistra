# Fix: View Marks Page Not Showing Classes for Term 2

## Problem
After migrating to yearly classes, the "View Marks" page doesn't show any classes when Term 2 is selected, even though the "Mark Entry" page works correctly.

## Root Cause
Classes are now **yearly** (no term field), but the view marks page may be:
1. Filtering classes by term on the client-side
2. Expecting classes to have a `term` field
3. Using enrollment data incorrectly

## Solution

### Backend (Already Fixed)
The backend correctly ignores the `term` parameter when listing classes:

```go
// class_service.go - Line 27
func (s *ClassService) List(schoolID, year, term, level string) ([]ClassWithCount, error) {
    classes, err := s.repo.FindByFilters(schoolID, year, "", level) // term ignored
    // ...
}
```

Classes are returned for **all terms** since they're yearly.

### Frontend Fix Required

The frontend needs to understand that:
1. **Classes are yearly** - They exist for the whole year, not per term
2. **Enrollments are per term** - Students are enrolled per term in yearly classes
3. **When viewing marks by term**, show ALL classes and filter students by their enrollment term

#### Option 1: Show All Classes (Recommended)
Always show all classes for the selected year, regardless of term selected. Filter marks by term, not classes.

**Example**:
```javascript
// ❌ WRONG - Don't filter classes by term
const filteredClasses = classes.filter(c => c.term === selectedTerm);

// ✅ CORRECT - Show all classes, filter marks/students by term
const classList = classes; // Show all
const marksForTerm = marks.filter(m => m.term === selectedTerm);
```

#### Option 2: Filter by Enrollment
Show classes that have at least one student enrolled for the selected term.

**API Call**:
```javascript
GET /api/classes?year=2024&level=P1
// Returns all P1 classes for 2024

// Then for each class, get students enrolled in that term:
GET /api/classes/{classId}/students?term=2
// Returns only students enrolled in Term 2
```

### Quick Test
1. **Backend working?** Test the API directly:
   ```bash
   # Should return all classes regardless of term
   curl http://localhost:8080/api/classes?year=2024&term=2
   ```
   
2. **Frontend issue?** Check browser console:
   - Look for client-side filtering by term
   - Check if classes are received but not displayed
   - Verify no JavaScript errors

### Files to Check/Update

#### Backend (Already Updated ✅)
- [x] `class_service.go` - Ignores term parameter
- [x] `class_repository.go` - Ignores term in queries
- [x] `class_handler.go` - Passes term but service ignores it

#### Frontend (Needs Update ⚠️)
Check these frontend files:
- `pages/marks/view.tsx` or similar
- `components/ClassFilter.tsx` or similar
- Any component that filters classes by term

Look for code like:
```typescript
// ❌ Remove this kind of filtering
classes.filter(c => c.term === selectedTerm)

// Or checks like:
if (class.term !== selectedTerm) return null;
```

### Expected Behavior

**Before (Termly Classes - OLD)**:
- Term 1: Shows P1 Term1, P2 Term1, etc.
- Term 2: Shows P1 Term2, P2 Term2, etc.
- Classes are created 3 times per year

**After (Yearly Classes - NEW)**:
- Term 1: Shows P1 2024, P2 2024, etc.
- Term 2: Shows P1 2024, P2 2024, etc. (SAME CLASSES)
- Term 3: Shows P1 2024, P2 2024, etc. (SAME CLASSES)
- Classes are created once per year

### Student/Marks Filtering

When viewing marks for a specific term, filter at the **enrollment/marks level**, not class level:

```sql
-- Get students in P1 Blue for Term 2
SELECT s.* FROM students s
JOIN enrollments e ON e.student_id = s.id
WHERE e.class_id = 'P1-Blue-2024-UUID'
  AND e.year = 2024
  AND e.term = '2'
  AND e.status = 'active';

-- Get marks for P1 Blue, Term 2
SELECT * FROM subject_results
WHERE class_id = 'P1-Blue-2024-UUID'
  AND year = 2024
  AND term = '2';
```

## Implementation Steps

1. **Verify backend** (already done):
   ```bash
   # Test API endpoint
   curl -H "Authorization: Bearer $TOKEN" \
     "https://yourserver.com/api/classes?year=2024&term=2"
   
   # Should return classes (not empty)
   ```

2. **Update frontend**:
   - Remove term filtering from class lists
   - Update UI to show "P1 2024" instead of "P1 Term 2 2024"
   - Filter students/marks by term, not classes

3. **Test**:
   - Select Year: 2024, Term: 2
   - Verify all classes appear
   - Verify marks shown are only for Term 2
   - Verify students shown are enrolled in Term 2

## Migration Note

If you have old data with term-specific classes:
- Old classes with term field still exist in database
- New classes created after migration won't have term
- Consider running cleanup:
  ```sql
  -- After migration, old termly classes will have been converted
  -- Verify classes table has no term column
  \d classes;
  ```

## Summary

**The fix is already in the backend code.** The issue is likely in the **frontend**:
- Frontend expects classes to have a `term` field
- Frontend filters classes client-side by term
- Frontend doesn't render classes without matching term

**Solution**: Update frontend to stop filtering classes by term, since classes are now yearly.

---

**Status**: Backend ✅ | Frontend ⚠️ Needs Update

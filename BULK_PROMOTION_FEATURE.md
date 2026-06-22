# Bulk Student Promotion Feature

## Overview
Students can now be promoted in bulk from one class to another for a new academic year. This allows schools to easily transition students at the beginning of each year without re-registering them.

## Implementation

### Backend
**Endpoint**: `POST /api/v1/students/bulk-promote`

**Request Body**:
```json
{
  "student_ids": ["uuid1", "uuid2", "uuid3"],
  "from_class_id": "source-class-uuid",
  "to_class_id": "target-class-uuid",
  "year": 2027
}
```

**Response**:
```json
{
  "message": "3 students promoted successfully",
  "promoted_count": 3
}
```

**What it does**:
1. Marks old enrollments as "completed" for selected students
2. Creates new enrollments in the target class for the new year
3. Skips students not found in the source class
4. Returns count of successfully promoted students

### Frontend

**Component**: `BulkPromotionModal.tsx`
- Reusable modal component for bulk promotion
- Shows checkboxes to select students
- Select target class and new year
- Live count of selected students

**Integration**: Added to class details page (`/classes/[id]`)
- "Promote Students" button in header
- Opens modal with current class context
- Refreshes student list after promotion

## User Flow

### From Class Details Page:
1. Navigate to a class (e.g., P1 Blue 2026)
2. Click "Promote Students" button
3. **Select new year** (defaults to next year, e.g., 2027)
4. **Select target class** (e.g., P2 Blue or P2 Red)
5. **Select students** to promote:
   - Use checkboxes to select individual students
   - Or click "Select All" for entire class
6. Click "Promote X Student(s)"
7. Success notification shows count promoted

### Handling Transfers/Dropouts:
- Simply **don't select** students who:
  - Transferred to another school
  - Dropped out
  - Are repeating the class
- Only selected students are promoted
- Unselected students remain in their current class/year

## Benefits

✅ **Fast**: Promote entire class in seconds instead of one-by-one

✅ **Flexible**: Choose which students to promote (exclude transfers/dropouts)

✅ **Accurate**: Students keep their admission numbers and history

✅ **Yearly**: Aligns with the yearly class/enrollment architecture

✅ **Simple**: No need to re-register students each year

## Example Scenarios

### Scenario 1: Promote Entire Class
- P1 Blue 2026 → P2 Blue 2027
- Select all 40 students
- Click "Promote 40 Students"

### Scenario 2: Some Students Transfer Out
- P2 Red 2026 → P3 Red 2027
- Class has 35 students
- 3 students transferred
- Select only 32 remaining students
- Click "Promote 32 Students"
- The 3 who transferred stay in P2 Red 2026

### Scenario 3: Students Repeat Class
- S1 A 2026 → S2 A 2027
- Class has 50 students
- 5 students are repeating S1
- Select only 45 students who passed
- Click "Promote 45 Students"
- The 5 repeaters stay in S1 A 2026

## Technical Notes

- **Yearly enrollments**: Students are enrolled once per year, visible for all 3 terms
- **No term needed**: Promotion only requires year and target class
- **Old enrollments preserved**: Previous enrollments marked "completed", not deleted
- **Student history**: Complete progression history maintained
- **Permission**: Only School Admin and DOS can promote students

## Files Modified

### Backend
- `internal/services/student_service.go` - Added `BulkPromoteStudents()` method
- `internal/handlers/student_handler.go` - Added `BulkPromote()` handler
- `internal/routes/protected_routes.go` - Added `POST /students/bulk-promote` route

### Frontend
- `components/BulkPromotionModal.tsx` - New reusable modal component
- `app/classes/[id]/page.tsx` - Added promote button and modal integration

## Testing

1. Create classes for current year (e.g., P1 Blue 2026)
2. Add students to the class
3. Create target classes for next year (e.g., P2 Blue 2027)
4. Go to P1 Blue 2026 class details
5. Click "Promote Students"
6. Select target class P2 Blue 2027
7. Select students (or select all)
8. Click "Promote X Students"
9. Verify success notification
10. Check P2 Blue 2027 - students should appear there
11. Check P1 Blue 2026 - promoted students should show as "completed" enrollment

---

**Status**: ✅ Fully implemented and ready for use

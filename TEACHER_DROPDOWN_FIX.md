# Teacher Dropdown Fix - Edit Class Form

## Issue
The Edit Class form was displaying fewer teachers than the Lesson Monitoring form.

## Root Cause
The Edit Class form (`frontend/src/app/classes/page.tsx`) was filtering out teachers that don't have a `teacher_profile_id`:

```typescript
teachersData?.filter((t: any) => t.teacher_profile_id).map(...)
```

This filter excluded teachers who were created but don't have a teacher profile ID yet, while the Lesson Monitoring form showed all teachers with role 'Teacher'.

## Fix Applied
**File**: `frontend/src/app/classes/page.tsx` (Line 292)

### Before
```typescript
...(teachersData?.filter((t: any) => t.teacher_profile_id).map((t: any) => ({ 
  value: t.teacher_profile_id, 
  label: `${t.first_name} ${t.last_name}` 
})) || [])
```

### After
```typescript
...(teachersData?.map((t: any) => ({ 
  value: t.teacher_profile_id || t.id, 
  label: `${t.first_name} ${t.last_name}` 
})) || [])
```

## Changes Made
1. Removed the `.filter((t: any) => t.teacher_profile_id)` that was excluding teachers
2. Changed value to use `t.teacher_profile_id || t.id` as fallback

## Impact
✅ Edit Class form now shows all teachers, matching Lesson Monitoring form
✅ Teachers without teacher_profile_id are now visible and selectable
✅ No breaking changes - uses teacher_profile_id when available, falls back to id

## Testing
Refresh the Classes page and verify that the teacher dropdown in the Edit Class form now shows the same number of teachers as the Lesson Monitoring form.

---
**Date**: 2025-01-02  
**Status**: ✅ Fixed

# Year-Based Filtering Fix

## Issue
The marks entry page, student management page, and AOI marks page were not properly filtering classes and students by the selected year, causing confusion when working with different academic years.

## Changes Made

### 1. Marks Entry Page (`/marks/enter/page.tsx`)

**Classes Query - Now Filters by Year**:
```typescript
// Before
const { data: classesData } = useQuery({
  queryKey: ['classes'],
  queryFn: async () => {
    const res = await classesApi.list()
    return Array.isArray(res) ? { classes: res } : res
  }
})

// After ✅
const { data: classesData } = useQuery({
  queryKey: ['classes', year],
  queryFn: async () => {
    const res = await classesApi.list({ year })
    return Array.isArray(res) ? { classes: res } : res
  }
})
```

**Students Query - Now Filters by Year**:
```typescript
// Before
const { data: studentsData } = useQuery({
  queryKey: ['students', classId],
  queryFn: async () => {
    if (!classId) return { students: [] }
    const res = await studentsApi.list({ class_id: classId, limit: -1 })
    return Array.isArray(res) ? { students: res } : res
  },
  enabled: !!classId
})

// After ✅
const { data: studentsData } = useQuery({
  queryKey: ['students', classId, year],
  queryFn: async () => {
    if (!classId) return { students: [] }
    const res = await studentsApi.list({ class_id: classId, year, limit: -1 })
    return Array.isArray(res) ? { students: res } : res
  },
  enabled: !!classId
})
```

### 2. Students Management Page (`/students/page.tsx`)

**Classes Query - Simplified to Filter by Year Only**:
```typescript
// Before
const { data: classesData } = useQuery({
  queryKey: ['classes', selectedYear, selectedTerm],
  queryFn: async () => {
    const params: any = {}
    if (selectedYear) params.year = selectedYear
    if (selectedTerm) params.term = selectedTerm
    const response = await classesApi.list(params)
    return Array.isArray(response) ? { classes: response } : response
  },
})

// After ✅
const { data: classesData } = useQuery({
  queryKey: ['classes', selectedYear],
  queryFn: async () => {
    const params: any = { year: selectedYear }
    const response = await classesApi.list(params)
    return Array.isArray(response) ? { classes: response } : response
  },
})
```

Note: Student query already includes year parameter, so it works correctly.

### 3. AOI Marks Entry Page (`/marks/aoi/page.tsx`)

**Classes Query - Now Filters by Year**:
```typescript
// Before
const { data: classesData } = useQuery({
  queryKey: ['classes'],
  queryFn: async () => {
    const res = await classesApi.list()
    return Array.isArray(res) ? { classes: res } : res
  }
})

// After ✅
const { data: classesData } = useQuery({
  queryKey: ['classes', year],
  queryFn: async () => {
    const res = await classesApi.list({ year })
    return Array.isArray(res) ? { classes: res } : res
  }
})
```

**Students Query - Now Filters by Year**:
```typescript
// Before
const { data: studentsData } = useQuery({
  queryKey: ['students', classId],
  queryFn: async () => {
    if (!classId) return { students: [] }
    const res = await studentsApi.list({ class_id: classId, limit: -1 })
    return Array.isArray(res) ? { students: res } : res
  },
  enabled: !!classId
})

// After ✅
const { data: studentsData } = useQuery({
  queryKey: ['students', classId, year],
  queryFn: async () => {
    if (!classId) return { students: [] }
    const res = await studentsApi.list({ class_id: classId, year, limit: -1 })
    return Array.isArray(res) ? { students: res } : res
  },
  enabled: !!classId
})
```

## Expected Behavior After Fix

### Marks Entry Page
1. Select **Year 2026**
   - Only classes from 2026 appear in dropdown
   - e.g., P1 Blue 2026, P2 Red 2026
2. Select a class
   - Only students enrolled in that class for 2026 appear
   - Students enrolled in same class for 2025 do NOT appear
3. Change year to **2027**
   - Class dropdown refreshes to show only 2027 classes
   - Student list refreshes for the new year

### Students Management Page
1. Select **Year 2026**
   - Class filter shows only 2026 classes
   - Student list shows students enrolled in selected class for 2026
2. Change to **Year 2027**
   - Class filter updates to show 2027 classes
   - Student list updates accordingly

### AOI Marks Entry Page
1. Select **Year 2026**
   - Only S1-S4 classes from 2026 appear
   - Students shown are from 2026 enrollments
2. Select a class and subject
   - Enter AOI marks for students in that class for 2026
3. Change year to **2027**
   - Class dropdown refreshes to show 2027 classes
   - Students refresh for 2027

## Why This Matters

**Yearly Classes Architecture**:
- Classes are created once per year (P1 Blue 2026, P1 Blue 2027)
- Students are enrolled yearly in these classes
- The same physical class (P1 Blue) exists separately for each year

**Without Year Filtering**:
- ❌ P1 Blue from 2025, 2026, and 2027 all appear together
- ❌ Students from all years mixed together
- ❌ Cannot distinguish which year you're working with

**With Year Filtering** ✅:
- ✅ Only P1 Blue 2026 appears when year=2026
- ✅ Only students enrolled in 2026 appear
- ✅ Clear separation between academic years

## Testing

1. **Marks Entry Page**:
   - Go to `/marks/enter`
   - Select Year: 2026, Term: Term 1
   - Verify class dropdown shows only 2026 classes
   - Select a class
   - Verify students shown are from 2026 enrollments
   - Change year to 2027
   - Verify classes and students refresh

2. **Students Page**:
   - Go to `/students`
   - Select Year: 2026
   - Verify class filter shows only 2026 classes
   - Select a class
   - Verify student list shows 2026 students
   - Change year to 2027
   - Verify everything updates

3. **AOI Marks Page**:
   - Go to `/marks/aoi`
   - Select Year: 2026, Term: Term 1
   - Verify only S1-S4 classes from 2026 appear
   - Select a class and subject
   - Verify students shown are from 2026
   - Change year to 2027
   - Verify classes and students update

## Related Files
- `/frontend/src/app/marks/enter/page.tsx` - Marks entry page
- `/frontend/src/app/marks/aoi/page.tsx` - AOI marks entry page
- `/frontend/src/app/students/page.tsx` - Student management page
- Backend already filters correctly via query parameters

---

**Status**: ✅ Fixed and ready for testing

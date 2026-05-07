# Advanced Level Mark Display Templates - Complete List

## Summary
There are **5 main places** where Advanced Level (S5/S6) marks are displayed in the system.

---

## 1. **View Marks Page** ✅ UPDATED
**Location**: `/frontend/src/app/view-marks/page.tsx`

**Purpose**: Main marks viewing interface for teachers/admins

**Display Format**:
- Table with columns: Student | Subject | Type | Exam | Paper 1 | Paper 2 | Paper 3 | Grade
- Shows subject type (Principal/Subsidiary)
- Groups results by student, subject, and exam type
- Always shows 3 paper columns

**Status**: ✅ **Just updated with new template**

---

## 2. **Results Page** ⚠️ NEEDS UPDATE
**Location**: `/frontend/src/app/results/page.tsx`

**Purpose**: Results management page (similar to view-marks but with more management features)

**Current Issues**:
- Uses old dynamic paper column generation
- Doesn't show subject type (Principal/Subsidiary)
- Similar structure to old view-marks page

**Lines**: 384-450 (Advanced Level Table section)

**Status**: ⚠️ **Needs to be updated with same template as view-marks**

---

## 3. **Parent Results Page** ⚠️ NEEDS UPDATE
**Location**: `/frontend/src/app/parent/results/page.tsx`

**Purpose**: Parents viewing their children's results

**Current Issues**:
- Uses dynamic paper column generation
- Doesn't show subject type
- Different grouping logic

**Lines**: 139-200 (Advanced Level Table section)

**Status**: ⚠️ **Needs to be updated**

---

## 4. **Report Cards Page** ✅ USES COMPONENT
**Location**: `/frontend/src/app/report-cards/page.tsx`

**Purpose**: Generate and preview report cards

**Implementation**: Uses `AdvancedLevelReportCard` component

**Status**: ✅ **Uses separate component (check component separately)**

---

## 5. **Advanced Level Report Card Component** ⚠️ CHECK NEEDED
**Location**: `/frontend/src/components/ReportCard/AdvancedLevelReportCard.tsx`

**Purpose**: Actual report card template for printing/PDF

**Status**: ⚠️ **Needs to be checked for paper display**

---

## 6. **Analytics/Class Rankings** ℹ️ SUMMARY ONLY
**Location**: `/frontend/src/app/analytics/class-rankings/page.tsx`

**Purpose**: Shows class rankings and performance analytics

**Display**: Likely shows aggregated data, not individual paper marks

**Status**: ℹ️ **Probably doesn't need paper-level detail**

---

## Summary Table

| # | Location | Purpose | Shows Papers? | Shows Subject Type? | Status |
|---|----------|---------|---------------|---------------------|--------|
| 1 | `/view-marks/page.tsx` | View marks | ✅ Yes (P1, P2, P3) | ✅ Yes | ✅ Updated |
| 2 | `/results/page.tsx` | Manage results | ⚠️ Dynamic | ❌ No | ⚠️ Needs update |
| 3 | `/parent/results/page.tsx` | Parent view | ⚠️ Dynamic | ❌ No | ⚠️ Needs update |
| 4 | `/report-cards/page.tsx` | Preview cards | 🔄 Uses component | 🔄 Uses component | ✅ Check component |
| 5 | `AdvancedLevelReportCard.tsx` | Print/PDF | ❓ Unknown | ❓ Unknown | ⚠️ Check needed |
| 6 | `/analytics/class-rankings` | Analytics | ℹ️ Summary | ℹ️ Summary | ℹ️ OK as is |

---

## Recommended Action Plan

### Priority 1: Update Results Page
Update `/results/page.tsx` with the same template as `/view-marks/page.tsx`

### Priority 2: Update Parent Results Page  
Update `/parent/results/page.tsx` with similar template (simplified for parents)

### Priority 3: Check Report Card Component
Review `AdvancedLevelReportCard.tsx` to ensure it displays papers correctly

### Priority 4: Test Everything
- Test with real data
- Verify paper marks display correctly
- Verify subject type (Principal/Subsidiary) shows correctly
- Verify grades are calculated properly

---

## Key Requirements for All Templates

1. **Always show Paper 1, Paper 2, Paper 3 columns** (not dynamic)
2. **Show subject type**: Principal (Prin) or Subsidiary (Sub)
3. **Extract marks from**: `result.raw_marks.mark` (primary field for Advanced level)
4. **Extract paper number from**: `result.paper` or `result.raw_marks.paper`
5. **Display marks as integers** (no decimals for marks out of 100)
6. **Show "-" for missing papers** (not 0 or blank)
7. **Color-code grades**: Green (A-E), Yellow (O), Red (F)

---

## Next Steps

Would you like me to:
1. ✅ Update `/results/page.tsx` with the new template?
2. ✅ Update `/parent/results/page.tsx` with the new template?
3. ✅ Check and update `AdvancedLevelReportCard.tsx` component?
4. ✅ All of the above?

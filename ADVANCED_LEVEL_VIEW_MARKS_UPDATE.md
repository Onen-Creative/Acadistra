# Advanced Level View Marks - Complete Rewrite

## Summary
Completely rewrote the Advanced Level (S5/S6) marks display table to properly show marks per paper with subject type indicators.

## Key Changes

### 1. **Fixed Table Structure**
- **Always shows Paper 1, Paper 2, Paper 3 columns** (no dynamic column generation)
- Added **Subject Type column** showing "Prin" (Principal) or "Sub" (Subsidiary)
- Cleaner, more predictable layout

### 2. **Improved Data Extraction**
```typescript
// Paper number extraction - checks multiple locations
let paperNum = 1
if (result.paper && result.paper > 0) {
  paperNum = result.paper
} else if (result.raw_marks?.paper && result.raw_marks.paper > 0) {
  paperNum = result.raw_marks.paper
}

// Mark value extraction - proper null/undefined handling
let markValue = 0
if (result.raw_marks) {
  if (result.raw_marks.mark !== undefined && result.raw_marks.mark !== null) {
    markValue = Number(result.raw_marks.mark)  // Advanced level primary field
  } else if (result.raw_marks.total !== undefined && result.raw_marks.total !== null) {
    markValue = Number(result.raw_marks.total)
  } else if (result.raw_marks.exam !== undefined && result.raw_marks.exam !== null) {
    markValue = Number(result.raw_marks.exam)
  }
}
```

### 3. **Subject Type Display**
- Shows "Prin" for Principal subjects (blue badge)
- Shows "Sub" for Subsidiary subjects (purple badge)
- Extracted from `result.subject?.subject_type` or `result.subject_type`

### 4. **Better Visual Design**
- Gradient header (blue to indigo)
- Larger, bolder marks display (text-lg font-bold)
- Color-coded grades:
  - Green: A, B, C, D, E (passing grades)
  - Yellow: O (ordinary level)
  - Red: F (fail)
- Hover effects on rows
- Better spacing and padding

### 5. **Cleaner Code Structure**
- Removed debug console.logs
- Used TypeScript Record types for better type safety
- More readable grouping logic
- Explicit handling of undefined/null values

## Expected Display

### Table Headers:
| Student | Subject | Type | Exam | Paper 1 | Paper 2 | Paper 3 | Grade |

### Example Row:
| Ayoo Sharon | Mathematics | Prin | EOT | 75 | 68 | 72 | B |
| Kilama Sunday | General Paper | Sub | EOT | 45 | - | - | O |

Where:
- **Type**: Shows if subject is Principal (Prin) or Subsidiary (Sub)
- **Paper 1, 2, 3**: Shows marks out of 100, or "-" if not entered
- **Grade**: Final subject grade with color coding

## How to Apply Changes

1. **Stop the development server** (if running)
2. **Restart with**: `npm run dev`
3. **Hard refresh browser**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

## If Marks Still Show as 0

This means the database actually has 0 values. To verify:

```sql
SELECT 
    s.first_name,
    sub.name as subject_name,
    r.paper,
    r.raw_marks,
    r.final_grade
FROM results r
JOIN students s ON r.student_id = s.id
JOIN standard_subjects sub ON r.subject_id = sub.id
WHERE r.year = 2026 AND r.term = 'Term 1'
LIMIT 5;
```

Check if `raw_marks` contains `{"mark": 0}` or actual values like `{"mark": 75}`.

## Notes

- Marks are displayed as integers (no decimals) since Advanced level is out of 100
- The table always shows 3 paper columns regardless of how many papers the subject has
- Subject type is important for UNEB grading (Principal subjects have different grade boundaries)

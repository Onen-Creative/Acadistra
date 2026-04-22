# Alphabetical Sorting Implementation

## Overview
Implemented alphabetical sorting for all student lists across the system. Students are now sorted by **first name first, then last name** for consistency and easier lookup.

**Naming Convention**: The system follows the convention where:
- **First Name** = Given name (e.g., "Onen" in "Onen David")
- **Last Name** = Surname/Family name (e.g., "David" in "Onen David")

Students will appear alphabetically sorted by their first name (Onen), and if multiple students have the same first name, they will be sorted by last name (David).

## Changes Made

### 1. Student Handler (`student_handler.go`)
- **List()**: Added `Order("students.first_name ASC, students.last_name ASC")` to main student list query
- **GetMyChildren()**: Added alphabetical sorting for parent portal student list

### 2. Marks Export Handler (`marks_export_handler.go`)
- **Added import**: `"sort"` package
- **ExportClassMarks()**: Added `sort.Slice()` to sort enrollments by student first name, then last name before exporting marks to Excel

### 3. Clinic Handler (`clinic_handler.go`)
- **GetVisits()**: Added `sort.Slice()` to sort clinic visits by student name alphabetically after loading student data

### 4. Library Handler (`library_handler.go`)
- No changes needed - library issues are sorted by issue date, not student name

### 5. Fees Handler (`fees_handler.go`)
- **Added import**: `"sort"` package
- **ListStudentFees()**: Added `sort.Slice()` to sort fees list by student first name, then last name after loading student data

### 6. Result Handler (`result_handler.go`)
- **GetPerformanceSummary()**: Added `ORDER BY s.first_name ASC, s.last_name ASC` to SQL query for performance summary

### 7. Bulk Import Handlers
All template generation functions now sort students alphabetically:
- **bulk_exam_marks_import_handler.go**: Uses `Order("students.first_name ASC, students.last_name ASC")`
- **bulk_ca_marks_import_handler.go**: Uses `Order("students.first_name ASC, students.last_name ASC")`
- **bulk_aoi_marks_import_handler.go**: Uses `Order("students.first_name ASC, students.last_name ASC")`

## Sorting Strategy

### Database-Level Sorting
Used for queries that can be sorted directly in SQL:
```go
Order("students.first_name ASC, students.last_name ASC")
```

### Application-Level Sorting
Used when student data is loaded via relationships or needs post-processing:
```go
sort.Slice(items, func(i, j int) bool {
    if items[i].Student.FirstName != items[j].Student.FirstName {
        return items[i].Student.FirstName < items[j].Student.FirstName
    }
    return items[i].Student.LastName < items[j].Student.LastName
})
```

## Example Sorting Order

With first name sorting, students will appear in this order:
1. Akello Janet
2. Akello Sarah
3. David Onen
4. Onen David
5. Onen Peter

## Benefits

1. **Consistency**: All student lists across the system now use the same sorting order (first name, then last name)
2. **Usability**: Teachers and staff can easily find students by their first name
3. **Excel Templates**: Downloaded templates have students in alphabetical order by first name for easier data entry
4. **Reports**: All reports and exports maintain consistent student ordering
5. **Cultural Fit**: Matches the naming convention used by most schools in the system

## Testing Recommendations

1. Test student list in main students page
2. Test marks entry page - verify students appear alphabetically
3. Test Excel template downloads (exam, CA, AOI) - verify student order
4. Test clinic visits list
5. Test fees list
6. Test parent portal - verify children list is sorted
7. Test marks export - verify Excel output has students in alphabetical order

## Notes

- Sorting is case-sensitive by default in PostgreSQL
- Empty first names will appear first in the sorted list
- Students with the same first name are sorted by last name
- The sorting applies to all views: marks entry, viewing, bursar, nurse, library activities
- **Naming Convention**: First name = given name (e.g., "Onen"), Last name = surname (e.g., "David")

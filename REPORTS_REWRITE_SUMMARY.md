# Reports Section - Complete Rewrite

## Overview
The reports section has been completely rewritten with proper structure, clean code, and better organization.

## Backend Structure

### New Handler: `reports_handler.go`
Location: `/backend/internal/handlers/reports_handler.go`

**Features:**
- Clean, minimal code
- Proper query optimization
- Excel generation using excelize
- Tenant isolation (school_id filtering)
- Proper error handling

**Endpoints:**

1. **Students Report** - `GET /api/v1/reports/students`
   - Query params: `class_id`, `year`, `term` (all optional)
   - Returns: Excel file with student details
   - Columns: #, Admission No, First Name, Middle Name, Last Name, Gender, DOB, Class, Status, Enrolled Date

2. **Staff Report** - `GET /api/v1/reports/staff`
   - Query params: `role` (optional)
   - Returns: Excel file with staff details
   - Columns: #, Employee ID, First Name, Last Name, Email, Phone, Role, Employment Type, Status, Date Hired

3. **Attendance Report** - `GET /api/v1/reports/attendance`
   - Query params: `start_date`, `end_date` (required), `class_id` (optional)
   - Returns: Excel file with attendance summary
   - Columns: #, Student Name, Admission No, Class, Total Days, Present, Absent, Late, Attendance %

4. **Performance Report** - `GET /api/v1/reports/performance`
   - Query params: `year`, `term` (required), `class_id` (optional)
   - Returns: Excel file with academic results
   - Columns: #, Student Name, Admission No, Class, Subject, CA, Exam, Total, Grade

### System Reports Handler (Existing)
Location: `/backend/internal/handlers/system_reports_handler.go`

**System Admin Only Endpoints:**
- `GET /api/v1/reports/system/schools` - All schools report
- `GET /api/v1/reports/system/users` - All users report
- `GET /api/v1/reports/system/students` - All students across schools
- `GET /api/v1/reports/system/activity` - Audit logs report
- `GET /api/v1/reports/system/performance` - System-wide performance metrics

## Frontend Structure

### Main Reports Page
Location: `/frontend/src/app/reports/page.tsx`

**Features:**
- Clean, modern UI with gradient cards
- Centralized filter panel
- Real-time loading states
- Toast notifications
- Responsive design

**Report Types:**
1. **Students Report** 🎓
   - Filters: Year, Term, Class
   - Blue gradient card

2. **Staff Report** 👥
   - Filters: Role
   - Green gradient card

3. **Attendance Report** 📅
   - Filters: Date Range, Class
   - Orange gradient card
   - Requires start and end dates

4. **Performance Report** 📊
   - Filters: Year, Term, Class
   - Purple gradient card

### Report Cards Page (Separate)
Location: `/frontend/src/app/report-cards/page.tsx`

**Purpose:** Generate and print student report cards (PDF format)
- Single student mode
- Bulk printing mode
- Level-specific templates (Nursery, Primary, O-Level, A-Level)

## Key Improvements

### Backend
✅ Separate handler for school reports vs system reports
✅ Minimal, clean code (no verbose implementations)
✅ Proper SQL joins for performance
✅ Tenant isolation built-in
✅ Consistent error handling
✅ Excel generation with proper formatting

### Frontend
✅ Single, unified reports page
✅ Centralized filter management
✅ Clean, modern UI with gradients
✅ Proper loading states
✅ Toast notifications for feedback
✅ Responsive grid layout
✅ Clear separation between reports and report cards

## Usage

### For School Admins/Teachers:
1. Navigate to `/reports`
2. Set filters (year, term, class, dates)
3. Click "Download Excel" on desired report
4. Report downloads automatically

### For System Admins:
- Access both school reports and system-wide reports
- System reports available at `/system/reports`

## API Routes Added to main.go

```go
// School reports (accessible by all authenticated users with tenant filtering)
protected.GET("/reports/students", reportsHandler.GenerateStudentsReport)
protected.GET("/reports/staff", reportsHandler.GenerateStaffReport)
protected.GET("/reports/attendance", reportsHandler.GenerateAttendanceReport)
protected.GET("/reports/performance", reportsHandler.GeneratePerformanceReport)

// System reports (system admin only - already existed)
sysAdmin.GET("/reports/system/schools", systemReportsHandler.GenerateSchoolsReport)
sysAdmin.GET("/reports/system/users", systemReportsHandler.GenerateUsersReport)
sysAdmin.GET("/reports/system/students", systemReportsHandler.GenerateStudentsReport)
sysAdmin.GET("/reports/system/activity", systemReportsHandler.GenerateActivityReport)
sysAdmin.GET("/reports/system/performance", systemReportsHandler.GeneratePerformanceReport)
```

## File Structure

```
backend/
├── internal/
│   └── handlers/
│       ├── reports_handler.go          (NEW - School reports)
│       └── system_reports_handler.go   (EXISTING - System reports)

frontend/
└── src/
    └── app/
        ├── reports/
        │   └── page.tsx                (REWRITTEN - Main reports page)
        └── report-cards/
            └── page.tsx                (EXISTING - PDF report cards)
```

## Testing

### Test Students Report:
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8080/api/v1/reports/students?year=2026&term=Term%201" \
  --output students.xlsx
```

### Test Attendance Report:
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8080/api/v1/reports/attendance?start_date=2026-01-01&end_date=2026-03-31" \
  --output attendance.xlsx
```

## Notes

- All reports respect tenant isolation (school_id)
- Reports are generated on-demand (no caching)
- Excel files use `.xlsx` format
- File naming includes date for easy organization
- Filters are optional except where noted
- Date format: `YYYY-MM-DD`
- All endpoints require authentication

## Future Enhancements

Potential additions:
- [ ] PDF export option
- [ ] Scheduled report generation
- [ ] Email delivery of reports
- [ ] Custom report builder
- [ ] Report templates
- [ ] Data visualization charts

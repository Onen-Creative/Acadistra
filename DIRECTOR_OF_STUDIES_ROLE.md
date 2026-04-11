# Director of Studies (DOS) Role

## Overview
The Director of Studies (DOS) role has been added to the Acadistra School Management System. This role is responsible for overseeing all classroom-related activities and academic performance.

## Role Code
- **Backend**: `dos`
- **Frontend**: `dos`

## Access Permissions

The Director of Studies has access to the following modules:

### 1. **Dashboard**
- View school-wide academic performance summary
- Access to key metrics and statistics

### 2. **Classes Management**
- View all classes
- Access class details and student lists
- Monitor class performance

### 3. **Students**
- View all students
- Access student profiles
- Search students by name, admission number, or class

### 4. **Results Management**
- View all student results
- Access performance data across all classes
- Monitor academic progress

### 5. **Report Cards**
- View and access all student report cards
- Monitor report card generation status

### 6. **Lesson Monitoring**
- View lesson records
- Monitor teaching activities
- Track lesson completion and quality

### 7. **Performance Analytics**
- Subject performance trends
- Class comparisons
- Subject comparisons
- Term comparisons
- Student progress tracking

### 8. **Class Rankings**
- View student rankings by class
- Export rankings to Excel
- Access rankings for all education levels (Nursery, Primary, O-Level, A-Level)

### 9. **Attendance**
- View attendance records
- Monitor student attendance patterns
- Access attendance reports and statistics

### 10. **Requisitions**
- Create requisitions for academic resources
- View requisition status
- Track requisition approvals

## Restrictions

The Director of Studies **CANNOT**:
- Manage finances (income/expenditure)
- Process payroll
- Manage fees
- Access library management
- Access clinic/health management
- Access inventory management
- Create or delete users
- Modify school settings
- Access system administration features

## Implementation Details

### Backend Changes

1. **Middleware** (`/backend/internal/middleware/auth.go`):
   - Added `RequireDOS()` function for DOS-specific routes
   - DOS role included in shared routes middleware

2. **Routes** (`/backend/cmd/api/main.go`):
   - DOS added to shared routes (students, staff, school, classes)
   - DOS added to requisitions access
   - DOS has access to all analytics and ranking endpoints

### Frontend Changes

1. **Navigation** (`/frontend/src/components/DashboardLayout.tsx`):
   - Added DOS menu items with 10 navigation links
   - DOS included in search functionality for students and classes

2. **Menu Structure**:
   ```typescript
   case 'dos':
     return [
       { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
       { href: '/classes', label: 'Classes', icon: BookOpen },
       { href: '/students', label: 'Students', icon: GraduationCap },
       { href: '/results', label: 'Results', icon: ClipboardList },
       { href: '/report-cards', label: 'Report Cards', icon: FileText },
       { href: '/lessons', label: 'Lesson Monitoring', icon: BookOpen },
       { href: '/analytics', label: 'Performance Analytics', icon: BarChart3 },
       { href: '/analytics/class-rankings', label: 'Class Rankings', icon: BarChart3 },
       { href: '/attendance', label: 'Attendance', icon: Calendar },
       { href: '/finance/requisitions', label: 'Requisitions', icon: ClipboardList },
     ]
   ```

## Creating a DOS User

### Via Staff Registration Form:
1. Login as School Admin
2. Navigate to **Staff** section
3. Click **+ Add Staff** button
4. Fill in the multi-step registration form:
   - **Step 1 - Personal Information**: First name, last name, etc.
   - **Step 2 - Contact & Address**: Email, phone, address
   - **Step 3 - Employment Details**: 
     - **Role**: Select **"Director of Studies"** from dropdown
     - Department, employment type, date joined, etc.
   - **Step 4 - Financial Information**: Salary, bank details, etc.
   - **Step 5 - Emergency Contact**: Emergency contact details
   - **Step 6 - Review**: Confirm all details
5. Click **Complete Registration**
6. A user account will be automatically created with:
   - Email: The email provided in the form
   - Role: `dos`
   - Default Password: `DOS@123`
   - The staff member will receive a welcome email with login credentials

### Via API:
```bash
POST /api/v1/staff
Authorization: Bearer <school_admin_token>

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "dos@school.com",
  "phone": "0700000000",
  "role": "Director of Studies",
  "employment_type": "Permanent",
  "date_joined": "2024-01-01"
}
```

**Note**: When you create a staff member with role "Director of Studies", the system automatically:
- Creates a staff record
- Creates a user account with role `dos`
- Sets default password to `DOS@123`
- Sends a welcome email with login credentials

## Use Cases

### 1. Academic Performance Monitoring
The DOS can:
- Monitor class rankings across all levels
- Track subject performance trends
- Compare performance across classes and terms
- Identify struggling students or classes

### 2. Lesson Quality Assurance
The DOS can:
- Review lesson records submitted by teachers
- Monitor lesson completion rates
- Track teaching quality metrics

### 3. Attendance Oversight
The DOS can:
- Monitor attendance patterns
- Identify students with poor attendance
- Generate attendance reports

### 4. Resource Planning
The DOS can:
- Create requisitions for academic materials
- Request teaching resources
- Track requisition approvals

## Security

- DOS users are authenticated via JWT tokens
- Role-based access control enforced at both frontend and backend
- DOS cannot access financial, payroll, or administrative functions
- All DOS actions are logged in the audit trail

## Notes

- The DOS role is designed specifically for academic oversight
- DOS users should be senior academic staff members
- Multiple DOS users can be created if needed (e.g., DOS for Primary, DOS for Secondary)
- DOS role complements the School Admin role by focusing purely on academics

---

**Created**: 2024
**Last Updated**: 2024
**Version**: 1.0

# Module Access Control Fix

## Problem
Nabumali Secondary School had only the **academic** module active, but when logging in as school admin, all features from other modules (HR, Finance, Library, Clinic, etc.) were visible and accessible.

## Root Cause
The backend had a `ModuleAccess` middleware created but it was **never applied** to any routes. The frontend correctly filtered menu items based on active modules, but the backend API endpoints were accessible regardless of module subscriptions.

## Solution Implemented

### Backend Changes

Applied the `ModuleAccess` middleware to all module-specific routes:

#### 1. School Admin Routes (`protected_routes.go`)
- **Academic Module**: Marks imports, results management, lessons, students, guardians, calendar, term dates
- **HR Module**: Staff management, payroll processing
- **SMS Module**: SMS sending, templates, provider configuration

#### 2. Role-Specific Routes (`role_routes.go`)

**Shared Routes:**
- **Academic Module**: Student lists, exports, teacher exports
- **HR Module**: Staff lists

**Parent Routes:**
- **Parent Portal Module**: All parent dashboard and child information endpoints

**Teacher Routes:**
- **Academic Module**: All marks import/export endpoints

**Bursar Routes:**
- **Finance Module**: Fees, payments, income, expenditure, SchoolPay, budgets, requisitions

**Librarian Routes:**
- **Library Module**: Books, issues, returns, reports

**Nurse Routes:**
- **Clinic Module**: Health profiles, visits, medicines, incidents

**Inventory Routes:**
- **Inventory Module**: Items, transactions, categories

**Common Protected Routes:**
- **Academic Module**: Attendance, classes, students, results, analytics, subjects, integration activities
- **Finance Module**: Fee types

### How It Works

1. When a user makes a request to a module-specific endpoint, the `ModuleAccess` middleware checks:
   - If the school has an active subscription to that module
   - If the subscription is currently active (not expired)

2. If the school doesn't have access:
   ```json
   {
     "error": "Module not activated",
     "message": "Your school does not have access to this module. Please contact support to activate it.",
     "module": "hr"
   }
   ```

3. If the school has access, the request proceeds normally.

### Frontend Behavior (Already Working)

The frontend already correctly:
- Fetches active modules on login via `/api/v1/subscriptions/active-codes`
- Stores them in Zustand store (`modulesStore.ts`)
- Filters menu items based on active modules in `DashboardLayoutWithModules.tsx`
- Hides menu items for inactive modules

## Module Codes

The system supports these modules:
- `academic` - Student enrollment, classes, marks, report cards, grading
- `finance` - Fees, payments, income, expenditure tracking
- `hr` - Staff management, payroll processing, salary structures
- `library` - Book cataloging, issuing, returns, fines
- `clinic` - Health records, visits, medicines, emergencies
- `inventory` - Stock tracking, requisitions, suppliers
- `sms` - SMS notifications for fees, attendance, results
- `parent_portal` - Parent access to student progress and fees

## Testing

To verify the fix:

1. **Check Nabumali's active modules:**
   ```sql
   SELECT m.code, m.name, ss.is_active 
   FROM school_subscriptions ss
   JOIN modules m ON ss.module_code = m.code
   JOIN schools s ON ss.school_id = s.id
   WHERE s.name = 'Nabumali Secondary School';
   ```

2. **Login as Nabumali school admin** and verify:
   - Only "Academic" menu items are visible
   - Attempting to access HR/Finance/Library/Clinic endpoints returns 403 Forbidden

3. **Test API directly:**
   ```bash
   # Should work (academic module active)
   curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/students
   
   # Should fail with 403 (hr module not active)
   curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/staff
   ```

## Migration Notes

All existing schools were automatically given all modules when the subscription system was created (backward compatibility). To restrict a school to specific modules:

```sql
-- Deactivate all modules except academic for a school
UPDATE school_subscriptions 
SET is_active = false 
WHERE school_id = 'SCHOOL_UUID' 
AND module_code != 'academic';
```

## System Admin Bypass

System admins bypass all module restrictions and can access all features regardless of school subscriptions.

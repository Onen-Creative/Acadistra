# Module Selection Feature for School Management

## Overview
Added module/subscription selection functionality to the school creation and editing forms in the System Admin panel.

---

## Changes Made

### 1. ✅ Updated School Form (`/app/system/schools/page.tsx`)

#### Added State Management
```typescript
const [selectedModules, setSelectedModules] = useState<string[]>([])
```

#### Enhanced Create Mutation
- Creates school first
- Then creates subscription with selected modules
- Sets 1-year subscription period by default

```typescript
// Create school first
const schoolRes = await api.post('/api/v1/schools', { ...data, logo_url: logoUrl })

// Then create subscription with selected modules
if (selectedModules.length > 0) {
  await api.post('/api/v1/subscriptions', {
    school_id: schoolRes.data.id,
    module_codes: selectedModules,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true
  })
}
```

#### Enhanced Update Mutation
- Updates school details
- Updates subscription modules

```typescript
// Update school
const schoolRes = await api.put(`/api/v1/schools/${id}`, { ...data, logo_url: logoUrl })

// Update subscription modules
if (selectedModules.length > 0) {
  await api.put(`/api/v1/subscriptions/school/${id}`, {
    module_codes: selectedModules
  })
}
```

#### Enhanced Edit Modal
- Fetches existing modules when editing
- Pre-selects active modules

```typescript
// Fetch school's active modules
const res = await api.get(`/api/v1/subscriptions/school/${school.id}/modules`)
setSelectedModules(res.data.module_codes || [])
```

---

### 2. ✅ Enhanced ModuleSelector Component (`/components/SubscriptionManagement.tsx`)

#### Added 'use client' Directive
- Required for client-side interactivity in Next.js App Router

#### Default Modules
Includes 8 core modules from the system:
1. **academic** - Academic Management
2. **finance** - Finance Management
3. **hr** - HR & Payroll
4. **library** - Library Management
5. **clinic** - Clinic Management
6. **inventory** - Inventory Management
7. **sms** - SMS Notifications
8. **parent_portal** - Parent Portal

#### Custom Styling
- Replaced Mantine Card with custom Tailwind CSS
- Beautiful checkbox cards with hover effects
- Responsive design
- Module code badges

#### Features
- ✅ Checkbox selection
- ✅ Module name and description
- ✅ Module code display
- ✅ Hover effects
- ✅ Empty state handling
- ✅ Fallback to default modules if API fails

---

## UI/UX Improvements

### Module Selection Section
```
┌─────────────────────────────────────────────────────┐
│  🛡️ Active Modules & Features                       │
│  Select which modules this school will have access  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ ☑ Payroll Management          [PAYROLL]      │  │
│  │   Manage staff salaries and payments         │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ ☐ Library Management          [LIBRARY]      │  │
│  │   Track books, issues, and returns           │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ... (more modules)                                 │
└─────────────────────────────────────────────────────┘
```

### Visual Design
- **Gradient background**: Indigo to blue
- **Card style**: White cards with border
- **Hover effect**: Border changes to indigo
- **Checkbox**: Large, accessible checkboxes
- **Badge**: Module code in colored badge
- **Typography**: Clear hierarchy with bold names

---

## API Endpoints Used

### Create Subscription
```
POST /api/v1/subscriptions
Body: {
  school_id: string,
  module_codes: string[],
  start_date: string,
  end_date: string,
  is_active: boolean
}
```

### Update Subscription
```
PUT /api/v1/subscriptions/school/:schoolId
Body: {
  module_codes: string[]
}
```

### Get School Modules
```
GET /api/v1/subscriptions/school/:schoolId/modules
Response: {
  module_codes: string[]
}
```

### Get Available Modules
```
GET /api/v1/modules
Response: Module[]
```

---

## User Flow

### Creating a School
1. System Admin clicks "Create School"
2. Fills in basic information (name, type, motto)
3. Fills in location details (country, region, address)
4. Fills in contact information (email, phone)
5. Uploads school logo (optional)
6. **Selects active modules** ← NEW
7. Clicks "Create School"
8. System creates school and subscription

### Editing a School
1. System Admin clicks "Edit" on a school
2. Form loads with existing data
3. **Existing modules are pre-selected** ← NEW
4. Admin can add/remove modules
5. Clicks "Update School"
6. System updates school and subscription

---

## Benefits

### For System Admins
✅ Control which features each school can access
✅ Easy module management during school setup
✅ Visual feedback on selected modules
✅ No need for separate subscription management page

### For Schools
✅ Only see features they've subscribed to
✅ Clear understanding of available modules
✅ Flexible subscription management

### For Development
✅ Centralized module management
✅ Easy to add new modules
✅ Type-safe with TypeScript
✅ Reusable ModuleSelector component

---

## Module Descriptions

| Code | Name | Description |
|------|------|-------------|
| academic | Academic Management | Student enrollment, classes, marks, report cards, grading |
| finance | Finance Management | Fees, payments, income, expenditure tracking |
| hr | HR & Payroll | Staff management, payroll processing, salary structures |
| library | Library Management | Book cataloging, issuing, returns, fines |
| clinic | Clinic Management | Health records, visits, medicines, emergencies |
| inventory | Inventory Management | Stock tracking, requisitions, suppliers |
| sms | SMS Notifications | Send SMS for fees, attendance, results |
| parent_portal | Parent Portal | Parent access to student progress and fees |

---

## Technical Details

### State Management
- **Local State**: `useState` for selected modules
- **React Query**: For API calls and cache management
- **Zustand Store**: `modulesStore` for global module access

### Form Integration
- Integrated into existing school form
- No breaking changes to existing functionality
- Graceful fallback if API fails

### Error Handling
- Default modules if API fails
- Empty state display
- Console error logging
- User-friendly error messages

---

## Testing Checklist

### Create School
- [ ] Can select modules during creation
- [ ] Selected modules are saved
- [ ] Subscription is created with correct modules
- [ ] School can access selected modules after creation

### Edit School
- [ ] Existing modules are pre-selected
- [ ] Can add new modules
- [ ] Can remove existing modules
- [ ] Changes are saved correctly

### UI/UX
- [ ] Checkboxes work correctly
- [ ] Hover effects display properly
- [ ] Module descriptions are clear
- [ ] Responsive on mobile devices
- [ ] Empty state displays when no modules

### Edge Cases
- [ ] Works when API fails (uses defaults)
- [ ] Works with no modules selected
- [ ] Works with all modules selected
- [ ] Handles network errors gracefully

---

## Future Enhancements

### Potential Improvements
1. **Module Pricing**: Show cost per module
2. **Module Dependencies**: Some modules require others
3. **Trial Periods**: Temporary access to modules
4. **Usage Analytics**: Track which modules are used
5. **Bulk Operations**: Enable/disable modules for multiple schools
6. **Module Categories**: Group related modules
7. **Custom Modules**: Allow schools to request custom features

### Backend Requirements
- Subscription pricing logic
- Module dependency validation
- Usage tracking
- Billing integration

---

## Files Modified

1. **`/app/system/schools/page.tsx`**
   - Added module selection state
   - Enhanced create/update mutations
   - Added ModuleSelector to form UI
   - Fetch modules on edit

2. **`/components/SubscriptionManagement.tsx`**
   - Added 'use client' directive
   - Custom Tailwind styling
   - Default modules list
   - Improved error handling

---

## Summary

✅ **Feature Complete**: Module selection fully integrated
✅ **User-Friendly**: Beautiful, intuitive UI
✅ **Robust**: Handles errors gracefully
✅ **Flexible**: Easy to add new modules
✅ **Type-Safe**: Full TypeScript support

**Impact**: System admins can now easily manage school subscriptions during school creation/editing, providing better control over feature access.

---

**Date**: 2025-05-05  
**Status**: ✅ Complete  
**Version**: 1.0

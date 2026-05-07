# Module-Based UI Filtering System

## Overview

The system now **hides** menu items and features from users if their school doesn't have the required module activated. Users only see functionalities for modules their school has subscribed to.

## How It Works

### 1. Backend - API Protection
Routes are protected by `ModuleAccess` middleware:

```go
finance := protected.Group("/finance")
finance.Use(middleware.ModuleAccess(deps.DB, "finance"))
```

If a school tries to access a deactivated module, they get:
```json
{
  "error": "Module not activated",
  "message": "Your school does not have access to this module."
}
```

### 2. Frontend - UI Filtering

#### Zustand Store
Active modules are fetched on app load and stored in Zustand:

```typescript
// stores/modulesStore.ts
export const useModulesStore = create<ModulesStore>((set, get) => ({
  activeModules: [],
  hasModule: (moduleCode) => get().activeModules.includes(moduleCode),
  fetchModules: async () => {
    // Fetches from /api/v1/subscriptions/active-codes
  }
}))
```

#### Menu Filtering
Menu items are filtered based on active modules:

```typescript
const getAllMenuItems = (): MenuItem[] => {
  return [
    { href: '/students', label: 'Students', icon: GraduationCap, module: 'academic' },
    { href: '/finance', label: 'Finance', icon: DollarSign, module: 'finance' },
    { href: '/library', label: 'Library', icon: Library, module: 'library' },
    // Items without module property are always shown
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]
}

const getMenuItems = () => {
  const allItems = getAllMenuItems()
  
  // Filter based on active modules
  return allItems.filter(item => {
    if (!item.module) return true // Always show if no module required
    return hasModule(item.module) // Check if school has this module
  })
}
```

## Module Mapping

| Module Code | Features Hidden When Inactive |
|------------|-------------------------------|
| `academic` | Students, Classes, Marks, Results, Report Cards, Attendance, Lessons, Analytics |
| `finance` | Fees, Payments, Income, Expenditure, Budget, Requisitions, SchoolPay |
| `hr` | Staff Management, Payroll, Salary Structures |
| `library` | Books, Book Issues, Library Reports |
| `clinic` | Patient Visits, Health Profiles, Medicines, Emergencies |
| `inventory` | Stock Tracking, Inventory Management |
| `sms` | SMS Sending, SMS Templates, SMS Logs |
| `parent_portal` | Parent Dashboard, Parent Access to Student Info |

## Implementation Steps

### 1. Backend Setup

Add endpoint to get active module codes:

```go
// handlers/subscription_handler.go
func (h *SubscriptionHandler) GetActiveModuleCodes(c *gin.Context) {
	schoolID, _ := uuid.Parse(c.GetString("school_id"))
	
	modules, err := h.service.GetActiveModules(schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch modules"})
		return
	}
	
	codes := make([]string, len(modules))
	for i, module := range modules {
		codes[i] = module.Code
	}
	
	c.JSON(http.StatusOK, gin.H{"modules": codes})
}
```

Add route:
```go
protected.GET("/subscriptions/active-codes", subscriptionHandler.GetActiveModuleCodes)
```

### 2. Frontend Setup

#### Install Zustand (if not already installed)
```bash
npm install zustand
```

#### Create Store
```typescript
// src/stores/modulesStore.ts
import { create } from 'zustand';

interface ModulesStore {
  activeModules: string[];
  loading: boolean;
  hasModule: (moduleCode: string) => boolean;
  fetchModules: () => Promise<void>;
}

export const useModulesStore = create<ModulesStore>((set, get) => ({
  activeModules: [],
  loading: true,
  
  hasModule: (moduleCode) => {
    const { activeModules } = get();
    return activeModules.includes(moduleCode);
  },

  fetchModules: async () => {
    try {
      set({ loading: true });
      const token = localStorage.getItem('token');
      
      if (!token) {
        set({ loading: false });
        return;
      }

      const response = await fetch('/api/v1/subscriptions/active-codes', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        set({ activeModules: data.modules || [], loading: false });
      }
    } catch (error) {
      console.error('Failed to fetch active modules:', error);
      set({ loading: false });
    }
  },
}));

export const useHasModule = (moduleCode: string): boolean => {
  return useModulesStore((state) => state.hasModule(moduleCode));
};
```

#### Initialize on App Load
```typescript
// src/components/ModulesInitializer.tsx
'use client';

import { useEffect } from 'react';
import { useModulesStore } from '@/stores/modulesStore';

export function ModulesInitializer() {
  const fetchModules = useModulesStore((state) => state.fetchModules);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  return null;
}
```

Add to providers:
```typescript
// src/app/providers.tsx
import { ModulesInitializer } from '@/components/ModulesInitializer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider>
      <ModulesInitializer />
      {children}
    </MantineProvider>
  );
}
```

#### Update DashboardLayout
Replace `DashboardLayout.tsx` with `DashboardLayoutWithModules.tsx` which filters menu items based on active modules.

### 3. Usage in Components

#### Check Module Access
```typescript
import { useHasModule } from '@/stores/modulesStore';

function MyComponent() {
  const hasFinance = useHasModule('finance');
  const hasLibrary = useHasModule('library');
  
  return (
    <div>
      {hasFinance && <FinanceWidget />}
      {hasLibrary && <LibraryWidget />}
    </div>
  );
}
```

#### Conditional Rendering
```typescript
import { useModulesStore } from '@/stores/modulesStore';

function Dashboard() {
  const hasModule = useModulesStore((state) => state.hasModule);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {hasModule('academic') && <StudentsCard />}
      {hasModule('finance') && <FeesCard />}
      {hasModule('library') && <BooksCard />}
      {hasModule('clinic') && <HealthCard />}
    </div>
  );
}
```

## Testing

### 1. Test Module Selection
```bash
# Create school with only academic and finance
curl -X POST -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test School",
    "school_type": "primary",
    "module_codes": ["academic", "finance"]
  }' \
  http://localhost:8080/api/v1/schools
```

### 2. Login as School User
- Login with a user from that school
- Verify only Academic and Finance menu items appear
- Library, Clinic, HR, etc. should be hidden

### 3. Update Modules
```bash
# Add library module
curl -X PUT -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "module_codes": ["academic", "finance", "library"]
  }' \
  http://localhost:8080/api/v1/schools/:id
```

- Refresh the page
- Library menu item should now appear

### 4. Test API Access
```bash
# Try accessing library without module
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/v1/library/books

# Should return 403:
{
  "error": "Module not activated",
  "message": "Your school does not have access to this module.",
  "module": "library"
}
```

## Migration

Run the migration to create module tables:
```bash
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260601000000_create_subscription_system.sql"
```

This:
- Creates `modules` and `school_subscriptions` tables
- Seeds 8 default modules
- Activates all modules for existing schools (backward compatibility)

## Benefits

1. **Clean UI** - Users only see what they can use
2. **No Confusion** - No clicking on features that return errors
3. **Better UX** - Focused interface based on school's needs
4. **Security** - Both frontend and backend protection
5. **Flexible** - Easy to add/remove modules per school

## Example Scenarios

### Small Primary School (Academic + Finance only)
**Sees:**
- Dashboard
- Students
- Classes
- Marks
- Results
- Attendance
- Fees
- Payments

**Hidden:**
- Staff/Payroll
- Library
- Clinic
- Inventory
- SMS

### Large Secondary School (All modules)
**Sees:**
- Everything

### Specialized School (Academic + Library + Clinic)
**Sees:**
- Dashboard
- Students
- Classes
- Library
- Clinic

**Hidden:**
- Finance
- HR/Payroll
- Inventory
- SMS

# Modular Package System

## Overview

The system is divided into **8 independent modules** that can be selected during school registration or updated later. Only activated modules are accessible to school users. **Billing is determined manually** by you - the system only tracks which modules are active.

## Available Modules

| Module Code | Name | Description |
|------------|------|-------------|
| `academic` | Academic Management | Student enrollment, classes, marks, report cards, grading |
| `finance` | Finance Management | Fees, payments, income, expenditure tracking |
| `hr` | HR & Payroll | Staff management, payroll processing, salary structures |
| `library` | Library Management | Book cataloging, issuing, returns, fines |
| `clinic` | Clinic Management | Health records, visits, medicines, emergencies |
| `inventory` | Inventory Management | Stock tracking, requisitions, suppliers |
| `sms` | SMS Notifications | Send SMS for fees, attendance, results |
| `parent_portal` | Parent Portal | Parent access to student progress and fees |

## How It Works

### 1. School Registration
When creating a school, select which modules they need:

```json
POST /api/v1/schools
{
  "name": "Example School",
  "school_type": "primary",
  "module_codes": ["academic", "finance", "sms"]
}
```

### 2. Update School Modules
System admin can update modules anytime:

```json
PUT /api/v1/schools/:id
{
  "name": "Example School",
  "module_codes": ["academic", "finance", "hr", "library"]
}
```

Or use dedicated endpoint:

```json
POST /api/v1/subscriptions/update
{
  "school_id": "uuid",
  "module_codes": ["academic", "finance"]
}
```

### 3. Module Access Control
Routes are protected by module middleware:

```go
// Finance routes - only accessible if school has finance module
finance := protected.Group("/finance")
finance.Use(middleware.ModuleAccess(deps.DB, "finance"))
{
    finance.GET("/income", financeHandler.ListIncome)
    finance.POST("/income", financeHandler.CreateIncome)
}
```

### 4. Access Denied Response
When a school tries to access a deactivated module:

```json
{
  "error": "Module not activated",
  "message": "Your school does not have access to this module. Please contact support to activate it.",
  "module": "finance"
}
```

## API Endpoints

### Get All Available Modules (for selection)
```
GET /api/v1/modules
Authorization: Bearer <token>
```

Response:
```json
[
  {
    "code": "academic",
    "name": "Academic Management",
    "description": "Student enrollment, classes, marks...",
    "is_active": true
  }
]
```

### Get School's Active Modules
```
GET /api/v1/subscriptions/modules
Authorization: Bearer <token>
```

Response:
```json
[
  {
    "code": "academic",
    "name": "Academic Management",
    "description": "Student enrollment, classes, marks...",
    "is_active": true
  },
  {
    "code": "finance",
    "name": "Finance Management",
    "description": "Fees, payments, income...",
    "is_active": true
  }
]
```

### Update School Modules (System Admin)
```
POST /api/v1/subscriptions/update
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "school_id": "uuid",
  "module_codes": ["academic", "finance", "hr"]
}
```

## Frontend Integration

### Module Selector (for school registration/update)
```tsx
import { ModuleSelector } from '@/components/SubscriptionManagement';

const [selectedModules, setSelectedModules] = useState<string[]>([]);

<ModuleSelector 
  selectedModules={selectedModules}
  onChange={setSelectedModules}
/>
```

### Active Modules Display (for school settings)
```tsx
import ActiveModulesDisplay from '@/components/SubscriptionManagement';

<ActiveModulesDisplay />
```

## Migration

### 1. Run Migration
```bash
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260601000000_create_subscription_system.sql"
```

This creates:
- `modules` table with 8 default modules
- `school_subscriptions` table to track active modules per school
- Auto-activates all modules for existing schools (backward compatibility)

### 2. Update Routes

Add module middleware to routes in `protected_routes.go`:

```go
// Add to setupProtectedRoutes function
setupSubscriptionRoutes(protected, deps)

// Add this function
func setupSubscriptionRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	subscriptionHandler := handlers.NewSubscriptionHandler(
		services.NewSubscriptionService(deps.DB),
	)
	
	// Public endpoint to get all modules
	protected.GET("/modules", subscriptionHandler.GetAllModules)
	
	// School admin can view their active modules
	schoolAdmin := protected.Group("")
	schoolAdmin.Use(middleware.RequireSchoolAdmin())
	{
		schoolAdmin.GET("/subscriptions/modules", subscriptionHandler.GetActiveModules)
	}
	
	// System admin can update modules
	sysAdmin := protected.Group("")
	sysAdmin.Use(middleware.RequireSystemAdmin())
	{
		sysAdmin.POST("/subscriptions/update", subscriptionHandler.UpdateSchoolModules)
	}
}

// Apply module middleware to existing routes
func setupFinanceRoutesWithModuleCheck(protected *gin.RouterGroup, deps *Dependencies) {
	finance := protected.Group("/finance")
	finance.Use(middleware.ModuleAccess(deps.DB, "finance"))
	{
		// ... finance routes
	}
}

func setupLibraryRoutesWithModuleCheck(protected *gin.RouterGroup, deps *Dependencies) {
	library := protected.Group("/library")
	library.Use(middleware.ModuleAccess(deps.DB, "library"))
	{
		// ... library routes
	}
}

func setupClinicRoutesWithModuleCheck(protected *gin.RouterGroup, deps *Dependencies) {
	clinic := protected.Group("/clinic")
	clinic.Use(middleware.ModuleAccess(deps.DB, "clinic"))
	{
		// ... clinic routes
	}
}

func setupPayrollRoutesWithModuleCheck(protected *gin.RouterGroup, deps *Dependencies) {
	payroll := protected.Group("/payroll")
	payroll.Use(middleware.ModuleAccess(deps.DB, "hr"))
	{
		// ... payroll routes
	}
}

func setupSMSRoutesWithModuleCheck(protected *gin.RouterGroup, deps *Dependencies) {
	sms := protected.Group("/sms")
	sms.Use(middleware.ModuleAccess(deps.DB, "sms"))
	{
		// ... sms routes
	}
}

func setupInventoryRoutesWithModuleCheck(protected *gin.RouterGroup, deps *Dependencies) {
	inventory := protected.Group("/inventory")
	inventory.Use(middleware.ModuleAccess(deps.DB, "inventory"))
	{
		// ... inventory routes
	}
}
```

## Billing

**Billing is manual** - you determine pricing based on:
- Number of modules activated
- School size (student count)
- Custom agreements
- Any other factors you choose

The system only tracks which modules are active. You handle billing separately through your own invoicing system.

## Example Scenarios

### Scenario 1: Small Primary School
**Needs**: Academic + Finance
```json
{
  "module_codes": ["academic", "finance"]
}
```
**You bill them**: $50/month (your pricing)

### Scenario 2: Large Secondary School
**Needs**: All modules
```json
{
  "module_codes": ["academic", "finance", "hr", "library", "clinic", "inventory", "sms", "parent_portal"]
}
```
**You bill them**: $200/month (your pricing)

### Scenario 3: School Wants to Add Module
1. School contacts you
2. You agree on new pricing
3. You update their modules via API or admin panel
4. Module becomes immediately accessible

## Testing

### 1. Test Module Selection During Registration
```bash
curl -X POST -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test School",
    "school_type": "primary",
    "module_codes": ["academic", "finance"]
  }' \
  http://localhost:8080/api/v1/schools
```

### 2. Test Module Access
```bash
# Should succeed if finance module is active
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/v1/finance/income

# Should return 403 if finance module is not active
```

### 3. Test Module Update
```bash
curl -X POST -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": "uuid",
    "module_codes": ["academic", "finance", "hr"]
  }' \
  http://localhost:8080/api/v1/subscriptions/update
```

## Backward Compatibility

The migration automatically activates **all modules** for existing schools, ensuring no disruption. You can then selectively adjust modules as needed.

## Support

For module management:
- Email: support@acadistra.com
- Phone: +256-XXX-XXXXXX

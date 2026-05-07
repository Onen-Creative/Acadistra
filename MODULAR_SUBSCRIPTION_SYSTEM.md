# Modular Subscription System

## Overview

The system is now divided into **8 independent modules** that schools can activate based on their needs. Schools are billed monthly based on active modules.

## Available Modules

| Module Code | Name | Description | Price/Month |
|------------|------|-------------|-------------|
| `academic` | Academic Management | Student enrollment, classes, marks, report cards, grading | $5.00 |
| `finance` | Finance Management | Fees, payments, income, expenditure tracking | $3.00 |
| `hr` | HR & Payroll | Staff management, payroll processing, salary structures | $3.00 |
| `library` | Library Management | Book cataloging, issuing, returns, fines | $2.00 |
| `clinic` | Clinic Management | Health records, visits, medicines, emergencies | $2.00 |
| `inventory` | Inventory Management | Stock tracking, requisitions, suppliers | $2.00 |
| `sms` | SMS Notifications | Send SMS for fees, attendance, results | $1.00 |
| `parent_portal` | Parent Portal | Parent access to student progress and fees | $1.00 |

## Implementation

### 1. Database Schema

Three new tables:
- **modules**: Stores available modules with pricing
- **school_subscriptions**: Tracks which modules each school has activated
- **subscription_billings**: Monthly billing records per school

### 2. Module Access Control

Use the `ModuleAccess` middleware to protect routes:

```go
// Protect finance routes
finance := protected.Group("/finance")
finance.Use(middleware.ModuleAccess(deps.DB, "finance"))
{
    finance.GET("/income", financeHandler.ListIncome)
    finance.POST("/income", financeHandler.CreateIncome)
}
```

### 3. API Endpoints

#### Get Active Modules (School Admin)
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
    "base_price": 5.00,
    "is_active": true
  }
]
```

#### Get Billing (School Admin)
```
GET /api/v1/subscriptions/billing
Authorization: Bearer <token>
```

Response:
```json
{
  "billing_month": "2026-06-01T00:00:00Z",
  "total_amount": 13.00,
  "module_breakdown": {
    "academic": 5.00,
    "finance": 3.00,
    "hr": 3.00,
    "sms": 1.00,
    "parent_portal": 1.00
  },
  "status": "pending"
}
```

#### Activate Module (System Admin Only)
```
POST /api/v1/subscriptions/activate
Authorization: Bearer <token>
Content-Type: application/json

{
  "school_id": "uuid",
  "module_code": "finance"
}
```

#### Deactivate Module (System Admin Only)
```
POST /api/v1/subscriptions/deactivate
Authorization: Bearer <token>
Content-Type: application/json

{
  "school_id": "uuid",
  "module_code": "finance"
}
```

### 4. Frontend Integration

Add to school settings page:

```tsx
import SubscriptionManagement from '@/components/SubscriptionManagement';

// In your settings page
<SubscriptionManagement />
```

### 5. Module Access Errors

When a school tries to access a deactivated module:

```json
{
  "error": "Module not activated",
  "message": "Your school does not have access to this module. Please contact support to activate it.",
  "module": "finance"
}
```

## Migration Steps

### 1. Run Migration
```bash
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260601000000_create_subscription_system.sql"
```

### 2. Update Routes

Add module middleware to existing routes in `protected_routes.go`:

```go
// Finance routes
finance := protected.Group("/finance")
finance.Use(middleware.ModuleAccess(deps.DB, "finance"))

// Library routes
library := protected.Group("/library")
library.Use(middleware.ModuleAccess(deps.DB, "library"))

// Clinic routes
clinic := protected.Group("/clinic")
clinic.Use(middleware.ModuleAccess(deps.DB, "clinic"))

// Payroll routes
payroll := protected.Group("/payroll")
payroll.Use(middleware.ModuleAccess(deps.DB, "hr"))

// SMS routes
sms := protected.Group("/sms")
sms.Use(middleware.ModuleAccess(deps.DB, "sms"))

// Inventory routes
inventory := protected.Group("/inventory")
inventory.Use(middleware.ModuleAccess(deps.DB, "inventory"))
```

### 3. Add Subscription Routes

In `protected_routes.go`, add:

```go
// In setupProtectedRoutes function
setupSubscriptionRoutes(protected, deps)

// Add this function
func setupSubscriptionRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	subscriptionHandler := handlers.NewSubscriptionHandler(
		services.NewSubscriptionService(deps.DB),
	)
	
	// System admin routes
	sysAdmin := protected.Group("")
	sysAdmin.Use(middleware.RequireSystemAdmin())
	{
		sysAdmin.POST("/subscriptions/activate", subscriptionHandler.ActivateModule)
		sysAdmin.POST("/subscriptions/deactivate", subscriptionHandler.DeactivateModule)
	}
	
	// School admin routes
	schoolAdmin := protected.Group("")
	schoolAdmin.Use(middleware.RequireSchoolAdmin())
	{
		schoolAdmin.GET("/subscriptions/modules", subscriptionHandler.GetActiveModules)
		schoolAdmin.GET("/subscriptions/billing", subscriptionHandler.GetBilling)
	}
}
```

## Billing Calculation

Billing is calculated automatically based on active modules:

```go
// Calculate billing for current month
billing, err := subscriptionService.CalculateMonthlyBilling(schoolID)
```

Example:
- School has: Academic ($5) + Finance ($3) + SMS ($1) = **$9/month**
- School adds Library ($2) = **$11/month**
- School removes Finance = **$8/month**

## Backward Compatibility

The migration automatically activates **all modules** for existing schools to ensure no disruption. You can then selectively deactivate modules as needed.

## Testing

### 1. Test Module Access
```bash
# Should succeed if module is active
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/v1/finance/income

# Should return 403 if module is inactive
```

### 2. Test Activation
```bash
# Activate finance module
curl -X POST -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"school_id":"uuid","module_code":"finance"}' \
  http://localhost:8080/api/v1/subscriptions/activate
```

### 3. Test Billing
```bash
# Get current billing
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/v1/subscriptions/billing
```

## Pricing Examples

### Small Primary School
- Academic: $5
- Finance: $3
- **Total: $8/month**

### Medium Secondary School
- Academic: $5
- Finance: $3
- HR: $3
- Library: $2
- SMS: $1
- **Total: $14/month**

### Large School (All Modules)
- Academic: $5
- Finance: $3
- HR: $3
- Library: $2
- Clinic: $2
- Inventory: $2
- SMS: $1
- Parent Portal: $1
- **Total: $19/month**

## Future Enhancements

1. **Usage-based pricing**: Charge based on student count
2. **Annual discounts**: 10% off for annual subscriptions
3. **Module bundles**: Package deals (e.g., "Complete Package" at $15/month)
4. **Trial periods**: 30-day free trial for new modules
5. **Payment integration**: Auto-charge via Stripe/PayPal
6. **Usage analytics**: Track module usage per school
7. **Module recommendations**: Suggest modules based on school type

## Support

For module activation/deactivation, contact:
- Email: sales@acadistra.com
- Phone: +256-XXX-XXXXXX

# Budget & Requisitions System

## Overview

Complete budget planning and requisition approval system for school financial management.

## Features

### 1. Budget Management
- **Annual/Term Budgets** - Set budgets by department and category
- **Real-time Tracking** - Monitor spending vs budget
- **Budget Transfers** - Reallocate funds between categories
- **Utilization Reports** - Track budget utilization rates

### 2. Requisition System
- **Purchase Requests** - Staff submit requisitions with itemized lists
- **Approval Workflow** - Multi-level approval (HOD → Bursar → Headteacher)
- **Budget Linking** - Link requisitions to budget lines
- **Priority Levels** - Urgent, High, Medium, Low
- **Status Tracking** - Pending, Approved, Rejected, Completed

### 3. Integration
- **Auto-commit Budget** - Approved requisitions reduce available budget
- **Expenditure Linking** - Link completed requisitions to actual expenditures
- **Audit Trail** - Track all approvals and changes

## Database Models

### Budget
```go
- school_id
- year, term
- department (Administration, Academic, Sports, etc.)
- category (Salaries, Supplies, Utilities, etc.)
- allocated_amount
- spent_amount
- committed_amount (approved requisitions)
- available_amount (allocated - spent - committed)
```

### Requisition
```go
- requisition_no (REQ-2024-001)
- department, category
- title, description, justification
- total_amount
- priority (urgent, high, medium, low)
- status (pending, approved, rejected, completed)
- requested_by, approved_by
- budget_id (linked budget line)
- items[] (itemized list)
```

### RequisitionItem
```go
- item_name
- quantity, unit
- unit_price, total_price
- specifications
```

## API Endpoints

### Budget Endpoints

**Create Budget**
```http
POST /api/v1/budgets
Authorization: Bearer {token}

{
  "year": 2024,
  "term": "Term 1",
  "department": "Academic",
  "category": "Supplies",
  "allocated_amount": 5000000,
  "notes": "Stationery and teaching materials"
}
```

**List Budgets**
```http
GET /api/v1/budgets?year=2024&term=Term%201&department=Academic
```

**Get Budget Summary**
```http
GET /api/v1/budgets/summary?year=2024&term=Term%201

Response:
{
  "summary": [
    {
      "department": "Academic",
      "allocated_total": 10000000,
      "spent_total": 6500000,
      "committed_total": 2000000,
      "available_total": 1500000,
      "utilization_rate": 65.0
    }
  ]
}
```

### Requisition Endpoints

**Create Requisition**
```http
POST /api/v1/requisitions
Authorization: Bearer {token}

{
  "department": "Academic",
  "category": "Supplies",
  "title": "Science Lab Equipment",
  "description": "Equipment for chemistry practicals",
  "justification": "Current equipment is outdated and insufficient",
  "priority": "high",
  "budget_id": "uuid-of-budget-line",
  "items": [
    {
      "item_name": "Beakers (250ml)",
      "quantity": 50,
      "unit": "pieces",
      "unit_price": 5000,
      "specifications": "Borosilicate glass"
    },
    {
      "item_name": "Test tubes",
      "quantity": 100,
      "unit": "pieces",
      "unit_price": 2000
    }
  ]
}
```

**List Requisitions**
```http
GET /api/v1/requisitions?status=pending&department=Academic&priority=high
```

**Approve Requisition**
```http
POST /api/v1/requisitions/{id}/approve

{
  "notes": "Approved for immediate purchase"
}
```

**Reject Requisition**
```http
POST /api/v1/requisitions/{id}/reject

{
  "notes": "Insufficient budget allocation"
}
```

**Get Requisition Stats**
```http
GET /api/v1/requisitions/stats

Response:
{
  "total_requisitions": 45,
  "pending_count": 12,
  "approved_count": 28,
  "rejected_count": 5,
  "total_amount": 15000000,
  "approved_amount": 10500000,
  "pending_amount": 3200000
}
```

## Workflow

### 1. Budget Setup (Start of Year/Term)
```
Bursar/Admin creates budget allocations:
- Set department budgets
- Break down by categories
- Set spending limits
```

### 2. Requisition Process
```
Step 1: Staff Member submits requisition
  - Fills form with items needed
  - Justifies the need
  - Sets priority level

Step 2: HOD/Department Head reviews
  - Checks if necessary
  - Verifies specifications
  - Approves or rejects

Step 3: Bursar reviews
  - Checks budget availability
  - Verifies pricing
  - Approves or rejects

Step 4: Headteacher final approval
  - Reviews high-value requisitions
  - Final authorization
  - Approves or rejects

Step 5: Procurement
  - Purchase items
  - Create expenditure record
  - Link to requisition
  - Mark as completed
```

### 3. Budget Tracking
```
Real-time updates:
- Approved requisitions reduce available budget
- Actual expenditures reduce spent amount
- Dashboard shows utilization rates
- Alerts when budget exceeded
```

## User Roles & Permissions

### Teacher/Staff
- ✅ Create requisitions
- ✅ View own requisitions
- ❌ Approve requisitions
- ❌ View budgets

### HOD (Head of Department)
- ✅ Create requisitions
- ✅ View department requisitions
- ✅ Approve department requisitions (Step 1)
- ✅ View department budgets
- ❌ Approve final

### Bursar
- ✅ Create budgets
- ✅ View all budgets
- ✅ View all requisitions
- ✅ Approve requisitions (Step 2)
- ✅ Create expenditures from requisitions
- ✅ Generate financial reports

### School Admin/Headteacher
- ✅ Full access to all features
- ✅ Final approval on requisitions
- ✅ Budget transfers
- ✅ Override approvals

## Frontend Pages

### 1. Budget Dashboard (`/finance/budget`)
- Budget overview cards
- Department breakdown
- Utilization charts
- Budget vs Actual graphs

### 2. Budget Management (`/finance/budget/manage`)
- Create/edit budgets
- Budget allocation table
- Transfer funds between categories
- Export budget reports

### 3. Requisitions List (`/finance/requisitions`)
- All requisitions table
- Filter by status, department, priority
- Quick approve/reject actions
- Export to Excel

### 4. Create Requisition (`/finance/requisitions/new`)
- Requisition form
- Add multiple items
- Link to budget line
- Set priority

### 5. Requisition Details (`/finance/requisitions/{id}`)
- Full requisition details
- Itemized list
- Approval history
- Approve/reject buttons
- Comments section

### 6. Budget Reports (`/finance/reports/budget`)
- Budget utilization report
- Department spending analysis
- Variance analysis
- Trend charts

## Implementation Steps

### Backend (Already Created)
1. ✅ Models created (`budget.go`)
2. ✅ Handlers created (`budget_handler.go`)
3. ⏳ Add routes to router
4. ⏳ Run migrations
5. ⏳ Test endpoints

### Frontend (To Create)
1. Create budget pages
2. Create requisition pages
3. Add approval workflow UI
4. Create budget charts/reports
5. Add notifications for approvals

### Integration
1. Link requisitions to expenditures
2. Auto-update budget on expenditure
3. Email notifications for approvals
4. SMS alerts for urgent requisitions

## Sample Data

### Budget Categories
- **Salaries**: Teaching staff, Support staff, Admin
- **Supplies**: Stationery, Teaching materials, Lab equipment
- **Utilities**: Electricity, Water, Internet
- **Maintenance**: Building repairs, Equipment servicing
- **Transport**: School buses, Fuel, Maintenance
- **Events**: Sports day, Prize giving, Excursions
- **Other**: Miscellaneous expenses

### Departments
- Administration
- Academic
- Sports & Games
- Maintenance
- Transport
- ICT
- Library
- Clinic

## Benefits

1. **Budget Control** - Prevent overspending
2. **Transparency** - Track all requests and approvals
3. **Accountability** - Audit trail for all transactions
4. **Efficiency** - Faster approval process
5. **Planning** - Better financial forecasting
6. **Compliance** - Meet audit requirements

## Next Steps

1. Add routes to backend router
2. Run database migrations
3. Create frontend pages
4. Test workflow end-to-end
5. Train staff on system
6. Deploy to production

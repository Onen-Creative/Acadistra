# Budget & Requisitions System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACADISTRA SCHOOL SYSTEM                       │
│                  Budget & Requisitions Module                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────┐        │
│  │   Budget Page        │      │  Requisitions Page   │        │
│  │  /finance/budget     │      │ /finance/requisitions│        │
│  ├──────────────────────┤      ├──────────────────────┤        │
│  │ • Create Budget      │      │ • Create Requisition │        │
│  │ • View Summary       │      │ • Add Items          │        │
│  │ • Filter by Year/Term│      │ • Approve/Reject     │        │
│  │ • Export to Excel    │      │ • View Statistics    │        │
│  │ • Update/Delete      │      │ • Export to Excel    │        │
│  └──────────────────────┘      └──────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────┐        │
│  │  Budget Handler      │      │ Requisition Handler  │        │
│  ├──────────────────────┤      ├──────────────────────┤        │
│  │ • CreateBudget()     │      │ • CreateRequisition()│        │
│  │ • ListBudgets()      │      │ • ListRequisitions() │        │
│  │ • GetSummary()       │      │ • ApproveRequisition│        │
│  │ • UpdateBudget()     │      │ • RejectRequisition()│        │
│  │ • DeleteBudget()     │      │ • GetStats()         │        │
│  └──────────────────────┘      └──────────────────────┘        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              Middleware Layer                         │      │
│  ├──────────────────────────────────────────────────────┤      │
│  │ • Authentication (JWT)                                │      │
│  │ • Authorization (Role-based)                          │      │
│  │ • Tenant Isolation (school_id)                        │      │
│  │ • Audit Logging                                       │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ SQL Queries
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   budgets    │  │ requisitions │  │requisition_  │         │
│  │              │  │              │  │   items      │         │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤         │
│  │ id           │  │ id           │  │ id           │         │
│  │ school_id    │  │ school_id    │  │requisition_id│         │
│  │ year         │  │requisition_no│  │ item_name    │         │
│  │ term         │  │ department   │  │ quantity     │         │
│  │ department   │  │ category     │  │ unit_price   │         │
│  │ category     │  │ title        │  │ total_price  │         │
│  │ allocated_amt│  │ total_amount │  │specifications│         │
│  │ spent_amt    │  │ priority     │  └──────────────┘         │
│  │ committed_amt│  │ status       │                            │
│  │ available_amt│  │ requested_by │  ┌──────────────┐         │
│  │ notes        │  │ approved_by  │  │requisition_  │         │
│  │ created_by   │  │ budget_id    │  │approval_flows│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Budget Creation Flow
```
User (Bursar/Admin)
    ↓
[Budget Form]
    ↓
POST /api/v1/budgets
    ↓
BudgetHandler.CreateBudget()
    ↓
Validate Input
    ↓
Calculate Available Amount
    ↓
Insert into budgets table
    ↓
Return Budget Object
    ↓
Update UI
```

### Requisition Approval Flow
```
Teacher
    ↓
[Create Requisition Form]
    ↓
POST /api/v1/requisitions
    ↓
RequisitionHandler.CreateRequisition()
    ↓
Generate Requisition Number (REQ-YYYY-NNN)
    ↓
Insert Requisition + Items
    ↓
Status: "pending"
    ↓
Bursar/Admin Reviews
    ↓
POST /api/v1/requisitions/:id/approve
    ↓
RequisitionHandler.ApproveRequisition()
    ↓
Start Transaction
    ↓
Update Requisition Status → "approved"
    ↓
Update Budget:
  • committed_amount += requisition.total_amount
  • available_amount -= requisition.total_amount
    ↓
Commit Transaction
    ↓
Return Success
    ↓
Update UI
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTIONS                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    REACT COMPONENTS                          │
│                                                              │
│  Budget Page Component                                       │
│    ├─ Budget Form Modal                                     │
│    ├─ Budget Summary Cards                                  │
│    ├─ Budget Table                                          │
│    └─ Export Button                                         │
│                                                              │
│  Requisitions Page Component                                │
│    ├─ Requisition Form Modal                                │
│    │   └─ Dynamic Items List                                │
│    ├─ Statistics Cards                                      │
│    ├─ Requisitions Table                                    │
│    │   └─ Approve/Reject Buttons                            │
│    └─ Export Button                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    API SERVICE LAYER                         │
│                                                              │
│  api.get('/budgets')                                        │
│  api.post('/budgets', data)                                 │
│  api.get('/budgets/summary')                                │
│  api.get('/requisitions')                                   │
│  api.post('/requisitions', data)                            │
│  api.post('/requisitions/:id/approve')                      │
│  api.post('/requisitions/:id/reject')                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND HANDLERS                          │
│                                                              │
│  BudgetHandler                                              │
│    ├─ CreateBudget()                                        │
│    ├─ ListBudgets()                                         │
│    ├─ GetBudgetSummary()                                    │
│    ├─ UpdateBudget()                                        │
│    └─ DeleteBudget()                                        │
│                                                              │
│  RequisitionHandler                                         │
│    ├─ CreateRequisition()                                   │
│    ├─ ListRequisitions()                                    │
│    ├─ GetRequisition()                                      │
│    ├─ ApproveRequisition()                                  │
│    ├─ RejectRequisition()                                   │
│    ├─ UpdateRequisition()                                   │
│    ├─ DeleteRequisition()                                   │
│    └─ GetRequisitionStats()                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE OPERATIONS                       │
│                                                              │
│  GORM ORM                                                   │
│    ├─ db.Create(&budget)                                    │
│    ├─ db.Find(&budgets)                                     │
│    ├─ db.Save(&budget)                                      │
│    ├─ db.Delete(&budget)                                    │
│    ├─ db.Create(&requisition)                               │
│    ├─ db.Preload("Items").Find(&requisitions)               │
│    └─ db.Transaction(func(tx *gorm.DB) error {...})         │
└─────────────────────────────────────────────────────────────┘
```

## Access Control Matrix

```
┌──────────────┬─────────────┬──────────────┬──────────────┐
│     Role     │   Budget    │ Requisitions │   Actions    │
├──────────────┼─────────────┼──────────────┼──────────────┤
│ System Admin │   ✅ Full   │   ✅ Full    │ All          │
├──────────────┼─────────────┼──────────────┼──────────────┤
│ School Admin │   ✅ Full   │   ✅ Full    │ All          │
├──────────────┼─────────────┼──────────────┼──────────────┤
│   Bursar     │   ✅ Full   │   ✅ Full    │ All          │
├──────────────┼─────────────┼──────────────┼──────────────┤
│   Teacher    │   ❌ None   │   ✅ Create  │ Create only  │
├──────────────┼─────────────┼──────────────┼──────────────┤
│   Others     │   ❌ None   │   ❌ None    │ None         │
└──────────────┴─────────────┴──────────────┴──────────────┘
```

## State Transitions

### Requisition Status Flow
```
┌─────────┐
│ PENDING │ ← Initial state when created
└────┬────┘
     │
     ├─────→ [Approve] ──→ ┌──────────┐
     │                      │ APPROVED │
     │                      └──────────┘
     │                           │
     │                           ↓
     │                      [Purchase Made]
     │                           │
     │                           ↓
     │                      ┌───────────┐
     │                      │ COMPLETED │
     │                      └───────────┘
     │
     └─────→ [Reject] ───→ ┌──────────┐
                            │ REJECTED │
                            └──────────┘
```

### Budget Amount Calculations
```
┌─────────────────────────────────────────────────────────┐
│                  BUDGET AMOUNTS                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Allocated Amount (Set by user)                         │
│         │                                                │
│         ├─→ Spent Amount (From expenditures)            │
│         │                                                │
│         ├─→ Committed Amount (From approved requisitions│
│         │                                                │
│         └─→ Available Amount = Allocated - Spent -      │
│                                 Committed                │
│                                                          │
│  Formula:                                                │
│  ────────────────────────────────────────────────────   │
│  Available = Allocated - Spent - Committed               │
│                                                          │
│  Example:                                                │
│  ────────────────────────────────────────────────────   │
│  Allocated:  10,000,000 UGX                              │
│  Spent:       6,000,000 UGX                              │
│  Committed:   2,000,000 UGX                              │
│  Available:   2,000,000 UGX                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND STACK                        │
├─────────────────────────────────────────────────────────┤
│  • Next.js 14 (React Framework)                         │
│  • TypeScript (Type Safety)                             │
│  • Tailwind CSS (Styling)                               │
│  • React Hooks (State Management)                       │
│  • Axios (HTTP Client)                                  │
│  • React Hot Toast (Notifications)                      │
│  • XLSX (Excel Export)                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    BACKEND STACK                         │
├─────────────────────────────────────────────────────────┤
│  • Go 1.21+ (Programming Language)                      │
│  • Gin (Web Framework)                                  │
│  • GORM (ORM)                                           │
│  • PostgreSQL/MySQL (Database)                          │
│  • JWT (Authentication)                                 │
│  • UUID (Unique Identifiers)                            │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
acadistra/
├── backend/
│   ├── cmd/
│   │   └── api/
│   │       └── main.go ✅ (Routes added)
│   ├── internal/
│   │   ├── models/
│   │   │   └── budget.go ✅ (Models defined)
│   │   └── handlers/
│   │       └── budget_handler.go ✅ (Handlers implemented)
│   └── migrations/
│       └── 20260207000000_create_budget_requisition_tables.sql ✅
│
├── frontend/
│   └── src/
│       └── app/
│           └── finance/
│               ├── budget/
│               │   └── page.tsx ✅ (Budget page)
│               └── requisitions/
│                   └── page.tsx ✅ (Requisitions page)
│
├── BUDGET_REQUISITIONS_IMPLEMENTATION.md ✅
├── BUDGET_QUICK_REFERENCE.md ✅
├── IMPLEMENTATION_SUMMARY.md ✅
├── setup-budget-system.sh ✅
└── README.md ✅ (Updated)
```

---

**System Status**: ✅ Production Ready
**Last Updated**: February 7, 2026
**Module**: Budget & Requisitions Management

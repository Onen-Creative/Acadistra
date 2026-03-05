# Budget & Requisitions Quick Reference

## 🚀 Quick Setup (3 Steps)

```bash
# 1. Run setup script
./setup-budget-system.sh

# 2. Start backend
cd backend && go run cmd/api/main.go

# 3. Start frontend
cd frontend && npm run dev
```

## 📍 Access URLs

- **Budget Management**: http://localhost:3000/finance/budget
- **Requisitions**: http://localhost:3000/finance/requisitions

## 🔑 User Access

| Role | Budget | Requisitions |
|------|--------|--------------|
| **Bursar** | ✅ Full Access | ✅ Create, Approve, Reject |
| **School Admin** | ✅ Full Access | ✅ Create, Approve, Reject |
| **Teacher** | ❌ No Access | ✅ Create Only |
| **Others** | ❌ No Access | ❌ No Access |

## 📊 Budget Management

### Create Budget
1. Click **"+ Add Budget"**
2. Fill in:
   - Year (e.g., 2024)
   - Term (Term 1, 2, or 3)
   - Department (Academic, Sports, etc.)
   - Category (Supplies, Salaries, etc.)
   - Allocated Amount (UGX)
   - Notes (optional)
3. Click **"Create Budget"**

### View Budget Summary
- Filter by **Year** and **Term**
- View department-wise cards showing:
  - Allocated Total
  - Spent Total
  - Available Total
  - Utilization Rate

### Export Budget
- Click **"📊 Export"** button
- Excel file downloads automatically

## 📝 Requisitions

### Create Requisition
1. Click **"+ New Requisition"**
2. Fill in basic info:
   - Department
   - Category
   - Title
   - Description
   - Justification
   - Priority (urgent/high/medium/low)
3. Add items:
   - Click **"+ Add Item"** for multiple items
   - Fill: Item name, Quantity, Unit, Unit Price, Specifications
   - Click **"Remove"** to delete an item
4. Click **"Submit Requisition"**

### Approve/Reject Requisition (Bursar/Admin only)
1. Find requisition in list
2. Click **"✓ Approve"** or **"✗ Reject"**
3. For rejection, enter reason

### Filter Requisitions
- **Status**: All, Pending, Approved, Rejected, Completed
- **Priority**: All, Urgent, High, Medium, Low
- Click **"Clear Filters"** to reset

### Export Requisitions
- Click **"📊 Export"** button
- Excel file downloads with all requisitions

## 🔄 Workflow

```
1. Create Budget Allocation
   ↓
2. Teacher Creates Requisition
   ↓
3. Bursar/Admin Reviews
   ↓
4. Approve → Budget Committed
   OR
   Reject → Requisition Closed
   ↓
5. Purchase Made
   ↓
6. Link to Expenditure
   ↓
7. Budget Spent Updated
```

## 💰 Budget Tracking

### Budget Amounts Explained
- **Allocated**: Total budget set for the period
- **Spent**: Actual money spent (from expenditures)
- **Committed**: Approved requisitions not yet spent
- **Available**: Allocated - Spent - Committed

### Formula
```
Available = Allocated - Spent - Committed
```

### Example
```
Allocated:  UGX 10,000,000
Spent:      UGX  6,000,000
Committed:  UGX  2,000,000
Available:  UGX  2,000,000
```

## 📱 Mobile Access

All pages are fully responsive:
- ✅ Works on phones and tablets
- ✅ Touch-friendly buttons
- ✅ Compact layouts on small screens
- ✅ Essential data prioritized

## 🎯 Priority Levels

| Priority | Color | Use Case |
|----------|-------|----------|
| **Urgent** | 🔴 Red | Immediate needs (broken equipment) |
| **High** | 🟠 Orange | Important but not urgent |
| **Medium** | 🟡 Yellow | Regular purchases |
| **Low** | 🟢 Green | Nice-to-have items |

## 📋 Departments

- Administration
- Academic
- Sports
- Maintenance
- Transport
- ICT
- Library
- Clinic

## 🏷️ Categories

- Salaries
- Supplies
- Utilities
- Maintenance
- Transport
- Events
- Other

## 🔍 Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| **Pending** | 🟡 Yellow | Awaiting approval |
| **Approved** | 🟢 Green | Approved, budget committed |
| **Rejected** | 🔴 Red | Rejected with reason |
| **Completed** | 🔵 Blue | Purchase made, linked to expenditure |

## 🛠️ Troubleshooting

### Budget not showing
- Check year and term filters
- Ensure budget was created for that period

### Cannot approve requisition
- Check user role (must be bursar or school_admin)
- Ensure requisition is in "pending" status

### Budget not updating after approval
- Check if budget_id is linked to requisition
- Verify database transaction completed

### Export not working
- Check browser console for errors
- Ensure data is loaded before exporting

## 📞 API Endpoints

### Budget
```
POST   /api/v1/budgets           - Create
GET    /api/v1/budgets           - List
GET    /api/v1/budgets/summary   - Summary
PUT    /api/v1/budgets/:id       - Update
DELETE /api/v1/budgets/:id       - Delete
```

### Requisitions
```
POST   /api/v1/requisitions           - Create
GET    /api/v1/requisitions           - List
GET    /api/v1/requisitions/:id       - Get one
GET    /api/v1/requisitions/stats     - Statistics
POST   /api/v1/requisitions/:id/approve - Approve
POST   /api/v1/requisitions/:id/reject  - Reject
PUT    /api/v1/requisitions/:id       - Update
DELETE /api/v1/requisitions/:id       - Delete
```

## 💡 Tips

1. **Create budgets at start of term** - Set up all department budgets before term begins
2. **Use descriptive titles** - Make requisitions easy to identify
3. **Add justification** - Helps approvers understand the need
4. **Set correct priority** - Urgent items get faster attention
5. **Review regularly** - Check budget utilization weekly
6. **Export for records** - Download Excel files for accounting

## 📚 Documentation

- **Full Guide**: `BUDGET_REQUISITIONS_IMPLEMENTATION.md`
- **API Docs**: `docs/BUDGET_REQUISITIONS.md`
- **Complete Docs**: `BUDGET_REQUISITIONS_COMPLETE.md`

## ✅ Quick Checklist

Before using the system:
- [ ] Database migration completed
- [ ] Backend server running
- [ ] Frontend server running
- [ ] Logged in as bursar or school_admin
- [ ] Budgets created for current term
- [ ] Test requisition created and approved

---

**Need Help?** Check the full documentation or contact system administrator.

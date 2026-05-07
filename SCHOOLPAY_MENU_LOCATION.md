# Where to Find SchoolPay Menu

## 🎯 Navigation Location

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACADISTRA SIDEBAR                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Dashboard                                                    │
│  👨‍🎓 Students                                                     │
│  👥 Staff                                                        │
│  📚 Classes                                                      │
│  📝 Results                                                      │
│  📄 Report Cards                                                 │
│  📅 Attendance                                                   │
│  📖 Lesson Monitoring                                            │
│  📦 Inventory                                                    │
│  📊 Reports                                                      │
│  📈 Performance Analytics                                        │
│  💰 Payroll                                                      │
│  💵 Finance                                                      │
│  💰 Budget                                                       │
│  📋 Requisitions                                                 │
│  💳 SchoolPay          ← ← ← HERE! NEW MENU ITEM               │
│  🔔 Announcements                                                │
│  ⚙️  Settings                                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 👥 Who Can See It?

### ✅ School Admin
```
Login as School Admin
  ↓
Dashboard
  ↓
Sidebar → Finance Section
  ↓
💳 SchoolPay (NEW!)
```

### ✅ Bursar
```
Login as Bursar
  ↓
Dashboard
  ↓
Sidebar → Finance Section
  ↓
💳 SchoolPay (NEW!)
```

### ✅ System Admin
```
Login as System Admin
  ↓
Can access via direct URL
  ↓
/finance/schoolpay
```

### ❌ Other Roles
- Teachers: No access
- Librarians: No access
- Nurses: No access
- Parents: No access

---

## 📱 Step-by-Step Visual Guide

### Step 1: Login
```
┌─────────────────────────────────────┐
│         ACADISTRA LOGIN             │
├─────────────────────────────────────┤
│                                     │
│  Email:    [bursar@school.com    ] │
│  Password: [••••••••••••••••••••] │
│                                     │
│         [Login Button]              │
│                                     │
└─────────────────────────────────────┘
```

### Step 2: Look at Sidebar
```
┌─────────────────────────────────────┐
│  SIDEBAR (Left Side of Screen)     │
├─────────────────────────────────────┤
│                                     │
│  Scroll down to Finance section... │
│                                     │
│  💰 Payroll                         │
│  💵 Finance                         │
│  💰 Budget                          │
│  📋 Requisitions                    │
│  💳 SchoolPay  ← CLICK HERE!       │
│                                     │
└─────────────────────────────────────┘
```

### Step 3: SchoolPay Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  SchoolPay Integration                          [Active ✓]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │Configuration │  │ Transactions │  │   Pending    │         │
│  │              │  │              │  │              │         │
│  │ [Configured] │  │  [125 Total] │  │  [5 Pending] │         │
│  │              │  │              │  │              │         │
│  │ [Manage →]   │  │ [View →]     │  │ [Process →]  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 If You Don't See It

### Check 1: User Role
```bash
# Check your role in browser console
console.log(localStorage.getItem('user'))

# Should show:
# {"role": "bursar"} or {"role": "school_admin"}
```

### Check 2: Refresh Browser
```
Press: Ctrl + F5 (Windows/Linux)
       Cmd + Shift + R (Mac)
```

### Check 3: Clear Cache
```
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
```

### Check 4: Logout and Login
```
1. Click Logout button (top right)
2. Login again
3. Check sidebar
```

### Check 5: Check Frontend Running
```bash
cd frontend
npm run dev

# Should see:
# ✓ Ready on http://localhost:3000
```

---

## 🎨 What It Looks Like

### Sidebar Menu Item
```
┌─────────────────────────────────────┐
│  💳 SchoolPay                       │
│     ↑                               │
│     Blue gradient when active       │
│     White text                      │
│     Dollar sign icon                │
└─────────────────────────────────────┘
```

### When Clicked
```
URL changes to: /finance/schoolpay
Page shows: SchoolPay Integration dashboard
```

---

## 📍 Direct URLs (If Menu Not Visible)

You can also access directly via URL:

```
Main Dashboard:
http://localhost:3000/finance/schoolpay

Configuration:
http://localhost:3000/finance/schoolpay/config

Transactions:
http://localhost:3000/finance/schoolpay/transactions
```

---

## 🎯 Quick Test

### Test 1: Check Menu Exists
1. Login as bursar or school_admin
2. Look at sidebar
3. Scroll to Finance section
4. Look for "SchoolPay" menu item

### Test 2: Click Menu
1. Click "SchoolPay" in sidebar
2. Should navigate to SchoolPay dashboard
3. Should see 3 cards: Configuration, Transactions, Pending

### Test 3: Navigate Pages
1. Click "Configuration" card
2. Should see configuration form
3. Go back and click "Transactions"
4. Should see transactions list

---

## ✅ Success Indicators

You know it's working when:

✅ "SchoolPay" appears in sidebar
✅ Clicking it navigates to /finance/schoolpay
✅ Dashboard shows 3 cards
✅ Configuration page loads
✅ Transactions page loads
✅ No console errors

---

## 🆘 Still Not Seeing It?

### Option 1: Check Code
```bash
# Check if file exists
ls -la frontend/src/components/DashboardLayout.tsx

# Search for SchoolPay in file
grep -n "SchoolPay" frontend/src/components/DashboardLayout.tsx

# Should show line numbers where SchoolPay appears
```

### Option 2: Restart Everything
```bash
# Stop backend
Ctrl+C

# Stop frontend
Ctrl+C

# Start backend
cd backend && go run cmd/api/main.go

# Start frontend (new terminal)
cd frontend && npm run dev

# Wait for both to start
# Then refresh browser
```

### Option 3: Check Browser Console
```
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors
4. If you see errors, copy and report them
```

---

## 📞 Need Help?

If you still don't see the menu:

1. **Check the code change was applied:**
   ```bash
   grep -A 5 "case 'bursar':" frontend/src/components/DashboardLayout.tsx
   ```
   Should show SchoolPay in the list

2. **Verify frontend rebuilt:**
   ```bash
   # Check .next directory updated
   ls -lt frontend/.next/
   ```

3. **Check for TypeScript errors:**
   ```bash
   cd frontend
   npm run build
   ```

4. **Try incognito/private window:**
   - Open new incognito window
   - Login again
   - Check if menu appears

---

## 🎉 Visual Confirmation

When everything is working, you should see:

```
SIDEBAR:
├── Dashboard
├── Students
├── Staff
├── ...
├── Finance
├── Budget
├── Requisitions
└── SchoolPay ← ← ← THIS IS NEW!
    └── Clicking opens SchoolPay dashboard
```

---

**Menu Added Successfully!** ✅

The SchoolPay menu item is now in the sidebar for bursar and school_admin users!

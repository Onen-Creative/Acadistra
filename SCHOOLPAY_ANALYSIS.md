# SchoolPay Integration Analysis

## ✅ What's Working

### 1. **Core Implementation**
- ✅ Service layer properly implemented (`schoolpay_service.go`)
- ✅ Handler layer exists (`schoolpay_handler.go`)
- ✅ Database models defined (`schoolpay.go`)
- ✅ Migrations created for tables
- ✅ Routes registered in bursar routes

### 2. **Features Implemented**
- ✅ Configuration management (per school)
- ✅ Transaction syncing (single date & date range)
- ✅ Webhook support for real-time notifications
- ✅ Transaction processing (converts to fee payments)
- ✅ Student matching (by SchoolPay code or admission number)
- ✅ MD5 hash authentication for API calls
- ✅ SHA256 signature verification for webhooks

### 3. **API Endpoints**
```
GET  /api/v1/schoolpay/config          - Get configuration
PUT  /api/v1/schoolpay/config          - Update configuration
POST /api/v1/schoolpay/sync            - Manual sync transactions
POST /api/v1/schoolpay/process         - Process unprocessed transactions
GET  /api/v1/schoolpay/transactions    - List transactions
POST /api/v1/webhooks/schoolpay/:school_id - Webhook endpoint (public)
```

## ⚠️ Critical Issues Found

### 1. **Context Key Mismatch** 🔴 HIGH PRIORITY
**Problem**: Handler uses `school_id` but middleware sets `tenant_school_id`

**Location**: `schoolpay_handler.go` lines 48, 91, 107, 135, 161

**Current Code**:
```go
schoolID, exists := c.Get("school_id")  // ❌ WRONG KEY
```

**Should Be**:
```go
schoolID := c.GetString("tenant_school_id")  // ✅ CORRECT
```

**Impact**: All protected SchoolPay endpoints will fail with "School ID required" error

---

### 2. **No Automated Sync Scheduler** 🟡 MEDIUM PRIORITY
**Problem**: No cron job to automatically sync transactions

**Current State**: Manual sync only via API call

**Recommendation**: Add scheduled job to sync daily
```go
// In cmd/api/main.go or cron package
func scheduleSchoolPaySync(db *gorm.DB) {
    c := cron.New()
    c.AddFunc("0 2 * * *", func() {  // Daily at 2 AM
        syncAllSchoolPayTransactions(db)
    })
    c.Start()
}
```

---

### 3. **Missing Student SchoolPay Code Migration** 🟡 MEDIUM PRIORITY
**File**: `migrations/20260130000000_add_schoolpay_code_to_students.sql`

**Check if applied**: Need to verify this migration ran
```sql
ALTER TABLE students ADD COLUMN schoolpay_code VARCHAR(50);
CREATE INDEX idx_students_schoolpay_code ON students(schoolpay_code);
```

---

### 4. **Hardcoded Base URL** 🟢 LOW PRIORITY
**Location**: `schoolpay_service.go` line 18
```go
const SchoolPayBaseURL = "https://schoolpay.co.ug/paymentapi"
```

**Better**: Use environment variable
```go
baseURL := os.Getenv("SCHOOLPAY_BASE_URL")
if baseURL == "" {
    baseURL = "https://schoolpay.co.ug/paymentapi"
}
```

---

### 5. **System User UUID Hardcoded** 🟢 LOW PRIORITY
**Location**: `schoolpay_service.go` line 267
```go
RecordedBy: uuid.MustParse("00000000-0000-0000-0000-000000000000")
```

**Better**: Create a proper system user or use school admin

---

### 6. **No Retry Logic for Failed API Calls** 🟢 LOW PRIORITY
**Problem**: Network failures will cause sync to fail completely

**Recommendation**: Add retry with exponential backoff

---

### 7. **No Transaction Reconciliation Report** 🟢 LOW PRIORITY
**Missing**: Report showing:
- Unmatched students
- Failed processing
- Duplicate transactions
- Amount discrepancies

---

## 🔧 Required Fixes for Production

### Fix 1: Context Key Issue (CRITICAL)
```go
// File: internal/handlers/schoolpay_handler.go
// Replace all instances of c.Get("school_id") with:

schoolID := c.GetString("tenant_school_id")
if schoolID == "" {
    c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
    return
}
schoolUUID, err := uuid.Parse(schoolID)
if err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid school ID"})
    return
}
```

### Fix 2: Add Automated Sync
Create `internal/cron/schoolpay_scheduler.go`:
```go
package cron

import (
    "time"
    "github.com/robfig/cron/v3"
    "gorm.io/gorm"
)

func StartSchoolPaySync(db *gorm.DB) {
    c := cron.New()
    
    // Sync yesterday's transactions daily at 2 AM
    c.AddFunc("0 2 * * *", func() {
        yesterday := time.Now().AddDate(0, 0, -1)
        syncAllSchools(db, yesterday)
    })
    
    c.Start()
}
```

### Fix 3: Verify Migration
```bash
# Check if schoolpay_code column exists
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -c \"SELECT column_name FROM information_schema.columns WHERE table_name='students' AND column_name='schoolpay_code';\""
```

---

## 📋 Deployment Checklist

- [ ] Fix context key mismatch in handler
- [ ] Verify SchoolPay tables exist in database
- [ ] Verify students.schoolpay_code column exists
- [ ] Configure SchoolPay credentials per school via admin panel
- [ ] Test webhook endpoint with SchoolPay test data
- [ ] Set up automated sync cron job
- [ ] Configure webhook URL in SchoolPay portal
- [ ] Test transaction sync manually
- [ ] Test transaction processing
- [ ] Monitor error logs for failed transactions

---

## 🧪 Testing Steps

### 1. Configuration Test
```bash
curl -X PUT http://localhost:8080/api/v1/schoolpay/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "school_code": "TEST001",
    "api_password": "test_password",
    "is_active": true
  }'
```

### 2. Manual Sync Test
```bash
curl -X POST http://localhost:8080/api/v1/schoolpay/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from_date": "2024-01-01",
    "to_date": "2024-01-31"
  }'
```

### 3. Webhook Test
```bash
curl -X POST http://localhost:8080/api/v1/webhooks/schoolpay/SCHOOL_UUID \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "test_signature",
    "type": "SCHOOL_FEES",
    "payment": {
      "amount": "50000",
      "schoolpayReceiptNumber": "SP123456",
      "studentPaymentCode": "STU001",
      "paymentDateAndTime": "2024-01-15 10:30:00"
    }
  }'
```

---

## 📊 Monitoring Recommendations

1. **Track Metrics**:
   - Transactions synced per day
   - Failed processing count
   - Unmatched students
   - Average processing time

2. **Alerts**:
   - Sync failures
   - Webhook signature mismatches
   - High error rates
   - Unprocessed transactions > 24 hours

3. **Logs**:
   - All API calls to SchoolPay
   - Webhook receipts
   - Transaction processing results
   - Student matching failures

---

## ✅ Conclusion

**Overall Status**: 🟡 **Partially Functional**

The SchoolPay integration is well-implemented but has **one critical bug** that prevents it from working in production. Once the context key issue is fixed, it should be fully functional.

**Priority Actions**:
1. Fix context key mismatch (30 minutes)
2. Test all endpoints (1 hour)
3. Add automated sync (2 hours)
4. Deploy and monitor (ongoing)

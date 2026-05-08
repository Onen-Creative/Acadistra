# SMS System Analysis - Production Readiness

## 🔴 Critical Issues Found

### 1. **Context Key Mismatch** (SAME AS SCHOOLPAY)
**Problem**: SMS handler uses `school_id` but middleware sets `tenant_school_id`

**Location**: `internal/handlers/sms.go` - ALL 10 handler methods

**Impact**: ALL SMS endpoints will fail with empty school_id

**Lines Affected**:
- Line 44: SendSMS
- Line 94: SendBulkSMS  
- Line 139: GetSMSQueue
- Line 154: GetSMSBatches
- Line 168: GetSMSLogs
- Line 182: GetSMSStats
- Line 207: CreateTemplate
- Line 229: GetTemplates
- Line 256: ConfigureProvider
- Line 278: GetProvider

---

### 2. **Missing SMSLog Model** 🔴
**Problem**: Service creates SMSLog records but model doesn't exist in models/sms.go

**Location**: `internal/services/sms/service.go` line 363
```go
log := &models.SMSLog{  // ❌ This struct doesn't exist!
    SchoolID:     sms.SchoolID,
    Recipient:    sms.PhoneNumber,
    ...
}
```

**Impact**: Compilation error or runtime panic

---

### 3. **Missing Fields in Models** 🟡
**Problem**: Database migration has fields that models don't have

**Missing in SMSQueue**:
- `batch_id` (in migration, not in model)
- `provider_message_id` (in migration, called `ProviderID` in model)

**Missing in SMSBatch**:
- `pending_count` (in migration, not in model)

---

### 4. **Phone Number Normalization Issue** 🟡
**Problem**: Hardcoded for Uganda only

**Location**: `internal/services/sms/service.go` line 378
```go
if strings.HasPrefix(phone, "0") {
    phone = "+256" + phone[1:]  // ❌ Uganda only
}
```

**Impact**: Won't work for schools in other countries

---

## ✅ What's Working

### 1. **Core Architecture** ✅
- Service layer properly implemented
- Handler layer exists
- Database migrations created
- Routes registered
- Scheduler running (every 1 minute)

### 2. **Provider Support** ✅
- Africa's Talking integration
- Twilio integration
- Extensible for custom providers

### 3. **Features Implemented** ✅
- Single SMS sending
- Bulk SMS with batching
- Template system with variables
- Queue management
- Scheduled SMS
- Retry logic (max 3 attempts)
- Cost tracking
- Statistics dashboard

### 4. **API Endpoints** ✅
```
POST /api/v1/sms/send           - Send single SMS
POST /api/v1/sms/bulk           - Send bulk SMS
GET  /api/v1/sms/queue          - View queue
GET  /api/v1/sms/batches        - View batches
GET  /api/v1/sms/logs           - View logs
GET  /api/v1/sms/stats          - View statistics
POST /api/v1/sms/templates      - Create template
GET  /api/v1/sms/templates      - List templates
POST /api/v1/sms/provider       - Configure provider
GET  /api/v1/sms/provider       - Get provider config
```

---

## 🔧 Required Fixes

### Fix 1: Context Key Issue (CRITICAL)
All 10 methods need to change from `school_id` to `tenant_school_id`

**Pattern to replace**:
```go
// OLD
schoolID := c.GetString("school_id")

// NEW
schoolID := c.GetString("tenant_school_id")
if schoolID == "" {
    c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
    return
}
```

---

### Fix 2: Add Missing SMSLog Model
Add to `internal/models/sms.go`:

```go
// SMSLog stores SMS delivery logs
type SMSLog struct {
    BaseModel
    SchoolID           uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
    BatchID            *uuid.UUID `gorm:"type:char(36);index" json:"batch_id,omitempty"`
    QueueID            *uuid.UUID `gorm:"type:char(36);index" json:"queue_id,omitempty"`
    Recipient          string     `gorm:"type:varchar(20);not null" json:"recipient"`
    Message            string     `gorm:"type:text;not null" json:"message"`
    Status             string     `gorm:"type:varchar(20);not null;index" json:"status"`
    SMSType            string     `gorm:"type:varchar(50);not null;default:'general';index" json:"sms_type"`
    Cost               float64    `gorm:"type:decimal(10,4);default:0" json:"cost"`
    Provider           string     `gorm:"type:varchar(50)" json:"provider"`
    ProviderMessageID  string     `gorm:"type:varchar(100)" json:"provider_message_id"`
    SentAt             *time.Time `json:"sent_at,omitempty"`
    DeliveredAt        *time.Time `json:"delivered_at,omitempty"`
    ErrorMessage       string     `gorm:"type:text" json:"error_message"`
    SentBy             uuid.UUID  `gorm:"type:char(36)" json:"sent_by"`
    School             *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
    Batch              *SMSBatch  `gorm:"foreignKey:BatchID" json:"batch,omitempty"`
}
```

---

### Fix 3: Update SMSQueue Model
Add missing fields:

```go
type SMSQueue struct {
    BaseModel
    SchoolID       uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
    BatchID        *uuid.UUID `gorm:"type:char(36);index" json:"batch_id,omitempty"` // ADD THIS
    RecipientID    *uuid.UUID `gorm:"type:char(36);index" json:"recipient_id,omitempty"`
    RecipientType  string     `gorm:"type:varchar(20)" json:"recipient_type"`
    PhoneNumber    string     `gorm:"type:varchar(20);not null" json:"phone_number"`
    Message        string     `gorm:"type:text;not null" json:"message"`
    Category       string     `gorm:"type:varchar(50);not null;index" json:"category"`
    Priority       int        `gorm:"default:5" json:"priority"`
    Status         string     `gorm:"type:varchar(20);default:'pending';index" json:"status"`
    ScheduledFor   *time.Time `json:"scheduled_for,omitempty"`
    SentAt         *time.Time `json:"sent_at,omitempty"`
    Attempts       int        `gorm:"default:0" json:"attempts"`
    MaxAttempts    int        `gorm:"default:3" json:"max_attempts"`
    ProviderID     string     `gorm:"column:provider_message_id;type:varchar(100)" json:"provider_id"` // FIX COLUMN NAME
    Cost           float64    `gorm:"type:decimal(10,4)" json:"cost"` // CHANGE TO decimal(10,4)
    ErrorMessage   string     `gorm:"type:text" json:"error_message"`
    Metadata       JSONB      `gorm:"type:json" json:"metadata"`
    CreatedBy      uuid.UUID  `gorm:"type:char(36);not null" json:"created_by"`
    School         *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
    Batch          *SMSBatch  `gorm:"foreignKey:BatchID" json:"batch,omitempty"` // ADD THIS
}
```

---

### Fix 4: Update SMSBatch Model
Add missing field:

```go
type SMSBatch struct {
    BaseModel
    SchoolID      uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
    Name          string     `gorm:"type:varchar(255);not null" json:"name"`
    Category      string     `gorm:"type:varchar(50);not null" json:"category"`
    TotalCount    int        `gorm:"not null" json:"total_count"`
    SentCount     int        `gorm:"default:0" json:"sent_count"`
    FailedCount   int        `gorm:"default:0" json:"failed_count"`
    PendingCount  int        `gorm:"default:0" json:"pending_count"` // ADD THIS
    Status        string     `gorm:"type:varchar(20);default:'pending'" json:"status"`
    TotalCost     float64    `gorm:"type:decimal(10,2);default:0" json:"total_cost"`
    StartedAt     *time.Time `json:"started_at,omitempty"`
    CompletedAt   *time.Time `json:"completed_at,omitempty"`
    CreatedBy     uuid.UUID  `gorm:"type:char(36);not null" json:"created_by"`
    School        *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}
```

---

### Fix 5: Make Phone Normalization Configurable
Add to SMSProvider model:

```go
type SMSProvider struct {
    BaseModel
    SchoolID     uuid.UUID `gorm:"type:char(36);not null;uniqueIndex" json:"school_id"`
    Provider     string    `gorm:"type:varchar(50);not null;default:'africastalking'" json:"provider"`
    APIKey       string    `gorm:"type:varchar(255)" json:"-"`
    APISecret    string    `gorm:"type:varchar(255)" json:"-"`
    Username     string    `gorm:"type:varchar(100)" json:"username"`
    SenderID     string    `gorm:"type:varchar(20)" json:"sender_id"`
    CountryCode  string    `gorm:"type:varchar(5);default:'+256'" json:"country_code"` // ADD THIS
    IsActive     bool      `gorm:"default:false" json:"is_active"`
    Balance      float64   `gorm:"type:decimal(10,2);default:0" json:"balance"`
    School       *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}
```

Update normalization function:
```go
func (s *Service) normalizePhone(phone string, countryCode string) string {
    phone = strings.TrimSpace(phone)
    phone = strings.ReplaceAll(phone, " ", "")
    phone = strings.ReplaceAll(phone, "-", "")
    
    if strings.HasPrefix(phone, "0") {
        phone = countryCode + phone[1:]
    } else if !strings.HasPrefix(phone, "+") {
        phone = countryCode + phone
    }
    
    return phone
}
```

---

## 📋 Deployment Checklist

- [ ] Fix context key mismatch in all 10 handler methods
- [ ] Add SMSLog model to models/sms.go
- [ ] Update SMSQueue model (add BatchID, fix ProviderID column)
- [ ] Update SMSBatch model (add PendingCount)
- [ ] Verify SMS tables exist in database
- [ ] Configure SMS provider credentials per school
- [ ] Test single SMS sending
- [ ] Test bulk SMS sending
- [ ] Test template rendering
- [ ] Verify scheduler is running
- [ ] Test retry logic for failed SMS
- [ ] Monitor SMS costs

---

## 🧪 Testing Steps

### 1. Configure Provider
```bash
curl -X POST https://your-domain.com/api/v1/sms/provider \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "africastalking",
    "api_key": "YOUR_API_KEY",
    "username": "YOUR_USERNAME",
    "sender_id": "SCHOOL"
  }'
```

### 2. Send Test SMS
```bash
curl -X POST https://your-domain.com/api/v1/sms/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+256700000000",
    "message": "Test SMS from Acadistra",
    "category": "test"
  }'
```

### 3. Check Queue
```bash
curl https://your-domain.com/api/v1/sms/queue \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Check Stats
```bash
curl https://your-domain.com/api/v1/sms/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Monitoring Recommendations

### 1. Track Metrics
- SMS sent per day
- Failed SMS count
- Average cost per SMS
- Queue length
- Delivery rate

### 2. Alerts
- Provider API failures
- High failure rate (>10%)
- Queue backlog (>100 pending)
- Cost threshold exceeded

### 3. Logs
- All SMS sent
- Provider responses
- Failed deliveries
- Retry attempts

---

## 💰 Cost Management

### Africa's Talking Pricing (Uganda)
- Local SMS: ~UGX 50-80 per SMS
- International: Varies by country

### Twilio Pricing
- Uganda: ~$0.05 per SMS
- International: Varies by country

### Recommendations
1. Set budget limits per school
2. Alert when 80% of budget used
3. Require approval for bulk SMS >100
4. Track cost per category (fees, attendance, etc.)

---

## ✅ Summary

**Current Status**: 🟡 **Partially Functional**

**Critical Issues**: 2
1. Context key mismatch (prevents all endpoints from working)
2. Missing SMSLog model (causes runtime errors)

**Medium Issues**: 2
1. Model field mismatches with database
2. Hardcoded country code

**Once Fixed**: ✅ **Fully Functional**

The SMS system is well-architected with:
- ✅ Proper queue management
- ✅ Retry logic
- ✅ Template system
- ✅ Bulk sending
- ✅ Cost tracking
- ✅ Scheduled sending
- ✅ Multi-provider support

**Priority Actions**:
1. Fix context keys (30 minutes)
2. Add SMSLog model (15 minutes)
3. Update other models (15 minutes)
4. Test thoroughly (2 hours)
5. Deploy and monitor (ongoing)

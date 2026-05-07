# SchoolPay Integration - Implementation Summary

## Overview

Successfully integrated SchoolPay API for real-time school fees payment notifications and transaction synchronization. SchoolPay is Uganda's leading school payment platform supporting MTN Mobile Money and Airtel Money.

## What Was Implemented

### 1. Database Models (`internal/models/schoolpay.go`)

**SchoolPayConfig**
- Stores per-school SchoolPay credentials
- Fields: school_code, api_password, webhook_url, webhook_enabled, is_active
- One config per school (multi-tenant support)

**SchoolPayTransaction**
- Stores all transactions from SchoolPay
- Supports both SCHOOL_FEES and OTHER_FEES (supplementary)
- Auto-links to students via payment code/admission number
- Tracks processing status and links to created fee payments

### 2. Service Layer (`internal/services/schoolpay_service.go`)

**Core Functions:**
- `SyncTransactionsForDate()` - Pull transactions for specific date
- `SyncTransactionsForRange()` - Pull transactions for date range (max 31 days)
- `ProcessWebhook()` - Handle real-time webhook notifications
- `ProcessUnprocessedTransactions()` - Batch process pending transactions
- `generateHash()` - MD5 authentication for sync API
- `verifyWebhookSignature()` - SHA256 signature verification

**Auto-processing:**
- Matches students by payment code or admission number
- Finds current term from payment date
- Creates FeesPayment record
- Updates StudentFees balance automatically

### 3. Handler Layer (`internal/handlers/schoolpay_handler.go`)

**Endpoints:**
- `GET /schoolpay/config` - Get SchoolPay configuration
- `PUT /schoolpay/config` - Update credentials and settings
- `POST /schoolpay/sync` - Manual transaction sync
- `POST /schoolpay/process` - Process unprocessed transactions
- `GET /schoolpay/transactions` - List transactions with filters
- `POST /webhooks/schoolpay/:school_id` - Public webhook endpoint

### 4. Database Migration (`migrations/20260129000000_create_schoolpay_tables.sql`)

**Tables:**
- `schoolpay_configs` - Per-school configuration
- `schoolpay_transactions` - Transaction storage

**Indexes:**
- Receipt number (unique)
- School ID, student ID, payment code
- Payment date, processed status
- Transaction type, completion status

### 5. Routes Integration

**Bursar Routes** (`internal/routes/role_routes.go`)
- Added SchoolPay endpoints to bursar section
- Accessible by: bursar, school_admin, system_admin

**Public Routes** (`internal/routes/public_routes.go`)
- Added public webhook endpoint (no auth required)
- SchoolPay servers can POST directly

### 6. Configuration (`internal/config/integrations.go`)

- Added `SchoolPayBaseURL` to IntegrationConfig
- Defaults to `https://schoolpay.co.ug/paymentapi`
- Configurable via environment variable

### 7. Documentation

**SCHOOLPAY_INTEGRATION.md**
- Complete setup guide
- API endpoint documentation
- Security details (signature verification)
- Troubleshooting guide
- Database schema reference
- Cron job examples

**.env.schoolpay.example**
- Environment variable template
- Configuration notes

## API Flow

### Webhook Flow (Real-time)
```
1. Student pays via SchoolPay (MTN/Airtel)
2. SchoolPay → POST /webhooks/schoolpay/{school_id}
3. Verify SHA256 signature
4. Save to schoolpay_transactions
5. Match student by payment code
6. Create fees_payment record
7. Update student_fees balance
8. Return 200 OK
```

### Manual Sync Flow
```
1. Bursar → POST /schoolpay/sync {"from_date": "2024-01-15"}
2. Generate MD5 hash: MD5(schoolCode + date + password)
3. Call SchoolPay API
4. Save transactions
5. Auto-process completed transactions
```

## Security Features

1. **Webhook Signature Verification**
   - SHA256(apiPassword + receiptNumber)
   - Prevents unauthorized webhook calls

2. **API Authentication**
   - MD5 hash for sync API calls
   - Per-school credentials

3. **Role-Based Access**
   - Only bursar, school_admin, system_admin can access
   - Public webhook endpoint for SchoolPay servers

## Key Features

✅ **Real-time Notifications** - Instant payment alerts via webhook
✅ **Manual Sync** - Pull historical transactions by date/range
✅ **Auto-matching** - Links payments to students automatically
✅ **Dual Transaction Types** - School fees & supplementary fees
✅ **Multi-tenant** - Each school has own credentials
✅ **Error Tracking** - Stores error messages for failed processing
✅ **Raw Payload Storage** - Keeps original JSON for debugging
✅ **Idempotent** - Duplicate receipts are ignored

## Student Matching Logic

```go
// Matches by payment code OR registration number
SELECT * FROM students 
WHERE school_id = ? 
AND (admission_no = payment_code OR admission_no = registration_number)
```

**Important:** Schools must ensure student admission numbers match SchoolPay payment codes.

## Transaction Processing

1. **Find Student** - By payment code/admission number
2. **Find Term** - Payment date must fall within term dates
3. **Get Student Fees** - Must have fees record for term/year
4. **Create Payment** - Insert into fees_payments
5. **Update Balance** - Recalculate outstanding amount
6. **Mark Processed** - Set processed=true, link fees_payment_id

## Usage Example

### 1. Configure SchoolPay

```bash
curl -X PUT https://acadistra.com/api/v1/schoolpay/config \
  -H "Authorization: Bearer <token>" \
  -d '{
    "school_code": "123456",
    "api_password": "secret_password",
    "webhook_url": "https://acadistra.com/api/v1/webhooks/schoolpay/abc-123",
    "webhook_enabled": true,
    "is_active": true
  }'
```

### 2. Register Webhook in SchoolPay Portal

1. Login to SchoolPay school portal
2. Settings → Webhooks
3. Enter: `https://acadistra.com/api/v1/webhooks/schoolpay/abc-123`
4. Enable notifications

### 3. Sync Historical Transactions

```bash
curl -X POST https://acadistra.com/api/v1/schoolpay/sync \
  -H "Authorization: Bearer <token>" \
  -d '{
    "from_date": "2024-01-01",
    "to_date": "2024-01-31"
  }'
```

### 4. View Transactions

```bash
curl https://acadistra.com/api/v1/schoolpay/transactions?processed=false
```

### 5. Process Pending

```bash
curl -X POST https://acadistra.com/api/v1/schoolpay/process \
  -H "Authorization: Bearer <token>"
```

## Files Created/Modified

### New Files
- `backend/internal/models/schoolpay.go`
- `backend/internal/services/schoolpay_service.go`
- `backend/internal/handlers/schoolpay_handler.go`
- `backend/migrations/20260129000000_create_schoolpay_tables.sql`
- `SCHOOLPAY_INTEGRATION.md`
- `backend/.env.schoolpay.example`

### Modified Files
- `backend/internal/config/integrations.go` - Added SchoolPayBaseURL
- `backend/internal/routes/role_routes.go` - Added bursar routes
- `backend/internal/routes/public_routes.go` - Added webhook endpoint
- `README.md` - Added SchoolPay to features list

## Testing Checklist

- [ ] Run migration: `20260129000000_create_schoolpay_tables.sql`
- [ ] Configure SchoolPay credentials via API
- [ ] Register webhook in SchoolPay portal
- [ ] Test webhook with sample payload
- [ ] Verify signature validation
- [ ] Test manual sync for single date
- [ ] Test manual sync for date range
- [ ] Verify student matching logic
- [ ] Test transaction processing
- [ ] Check fees_payment creation
- [ ] Verify student_fees balance update
- [ ] Test error handling (invalid student, missing term)
- [ ] Monitor webhook logs

## Next Steps

1. **Run Migration**
   ```bash
   psql -U postgres -d acadistra < migrations/20260129000000_create_schoolpay_tables.sql
   ```

2. **Configure First School**
   - Use Postman/curl to set up SchoolPay config
   - Get credentials from SchoolPay portal

3. **Register Webhook**
   - Login to SchoolPay school portal
   - Add webhook URL

4. **Test Payment**
   - Make test payment via SchoolPay
   - Verify webhook received
   - Check transaction created
   - Confirm fees_payment created

5. **Monitor**
   - Check `schoolpay_transactions` table
   - Review error_message for failures
   - Verify processed transactions

## Support

- SchoolPay API: https://schoolpay.co.ug/api-docs
- SchoolPay Support: support@schoolpay.co.ug
- Integration Docs: `SCHOOLPAY_INTEGRATION.md`

## License

MIT License

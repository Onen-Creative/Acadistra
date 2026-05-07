# SchoolPay Integration

Real-time school fees payment notification and transaction sync with SchoolPay Uganda.

## Features

✅ **Real-time Webhooks** - Instant payment notifications
✅ **Transaction Sync** - Pull transactions by date or date range
✅ **Auto-matching** - Automatically matches payments to students
✅ **Signature Verification** - SHA256 webhook signature validation
✅ **Dual Transaction Types** - School fees & supplementary fees
✅ **Auto-processing** - Creates fee payments automatically

## Setup

### 1. Run Migration

```bash
# Apply SchoolPay tables migration
psql -U postgres -d acadistra < migrations/20260129000000_create_schoolpay_tables.sql
```

### 2. Configure SchoolPay Credentials

**Via API (Bursar/School Admin):**

```bash
POST /api/v1/schoolpay/config
Authorization: Bearer <token>

{
  "school_code": "123456",
  "api_password": "your_secret_password",
  "webhook_url": "https://yourdomain.com/api/v1/webhooks/schoolpay/<school_id>",
  "webhook_enabled": true,
  "is_active": true
}
```

### 3. Register Webhook in SchoolPay Portal

1. Login to SchoolPay school portal
2. Navigate to Settings → Webhooks
3. Enter webhook URL: `https://yourdomain.com/api/v1/webhooks/schoolpay/<your_school_id>`
4. Enable webhook notifications
5. Ensure subscription is active

## API Endpoints

### Configuration

**Get Config**
```
GET /api/v1/schoolpay/config
```

**Update Config**
```
PUT /api/v1/schoolpay/config
{
  "school_code": "123456",
  "api_password": "secret",
  "webhook_url": "https://...",
  "webhook_enabled": true,
  "is_active": true
}
```

### Transaction Sync

**Sync Single Date**
```
POST /api/v1/schoolpay/sync
{
  "from_date": "2024-01-15"
}
```

**Sync Date Range (max 31 days)**
```
POST /api/v1/schoolpay/sync
{
  "from_date": "2024-01-01",
  "to_date": "2024-01-31"
}
```

### Transaction Management

**Get Transactions**
```
GET /api/v1/schoolpay/transactions?processed=false&type=SCHOOL_FEES&from_date=2024-01-01
```

Query params:
- `processed`: true/false
- `type`: SCHOOL_FEES or OTHER_FEES
- `from_date`: YYYY-MM-DD
- `to_date`: YYYY-MM-DD

**Process Unprocessed Transactions**
```
POST /api/v1/schoolpay/process
```

### Webhook (Public)

```
POST /api/v1/webhooks/schoolpay/:school_id
```

## How It Works

### 1. Webhook Flow (Real-time)

```
SchoolPay → Webhook → Verify Signature → Save Transaction → Auto-process
```

1. Student pays via SchoolPay (MTN/Airtel Mobile Money)
2. SchoolPay sends webhook to your URL
3. System verifies SHA256 signature
4. Transaction saved to `schoolpay_transactions`
5. Auto-matches student by payment code/admission number
6. Creates `fees_payment` record
7. Updates `student_fees` balance

### 2. Manual Sync Flow

```
Admin → Sync Request → SchoolPay API → Save Transactions → Process
```

1. Bursar initiates sync for date/range
2. System generates MD5 hash: `MD5(schoolCode + date + password)`
3. Calls SchoolPay API
4. Saves transactions
5. Processes unprocessed transactions

### 3. Transaction Processing

```sql
-- 1. Find student by payment code or admission number
SELECT * FROM students 
WHERE school_id = ? 
AND (admission_no = payment_code OR admission_no = registration_number)

-- 2. Find current term
SELECT * FROM term_dates 
WHERE school_id = ? 
AND payment_date BETWEEN start_date AND end_date

-- 3. Get student fees record
SELECT * FROM student_fees 
WHERE student_id = ? AND term = ? AND year = ?

-- 4. Create payment
INSERT INTO fees_payments (...)

-- 5. Update balance
UPDATE student_fees 
SET amount_paid = amount_paid + ?, 
    outstanding = total_fees - amount_paid
```

## Student Matching

System matches SchoolPay transactions to students using:

1. **Payment Code** → `students.admission_no`
2. **Registration Number** → `students.admission_no`

**Important:** Ensure student admission numbers match SchoolPay payment codes.

## Security

### Webhook Signature Verification

```go
// SchoolPay sends SHA256 hash
signature = SHA256(apiPassword + receiptNumber)

// System verifies
expectedSignature = SHA256(config.APIPassword + payload.ReceiptNumber)
if signature != expectedSignature {
    return "Invalid signature"
}
```

### API Authentication

```go
// Sync API uses MD5 hash
hash = MD5(schoolCode + date + password)
url = "https://schoolpay.co.ug/paymentapi/AndroidRS/SyncSchoolTransactions/{code}/{date}/{hash}"
```

## Transaction Types

### 1. School Fees (SCHOOL_FEES)

Regular tuition payments

```json
{
  "type": "SCHOOL_FEES",
  "payment": {
    "amount": "350000",
    "studentName": "John Doe",
    "studentPaymentCode": "1005416321",
    "sourcePaymentChannel": "MTN MobileMoney",
    "schoolpayReceiptNumber": "18843014"
  }
}
```

### 2. Supplementary Fees (OTHER_FEES)

Uniforms, meals, transport, etc.

```json
{
  "type": "OTHER_FEES",
  "payment": {
    "amount": "150000",
    "supplementaryFeeDescription": "UNIFORM FEES",
    "supplementaryFeeId": "20",
    "studentClass": "JUNIORTWO"
  }
}
```

## Monitoring

### Check Sync Status

```sql
SELECT school_code, last_sync_at, is_active 
FROM schoolpay_configs 
WHERE school_id = ?;
```

### Unprocessed Transactions

```sql
SELECT COUNT(*) 
FROM schoolpay_transactions 
WHERE school_id = ? 
AND processed = false 
AND transaction_completion_status = 'Completed';
```

### Failed Transactions

```sql
SELECT * 
FROM schoolpay_transactions 
WHERE school_id = ? 
AND processed = false 
AND error_message IS NOT NULL;
```

## Troubleshooting

### Webhook Not Receiving Calls

1. **Check webhook URL** - Must be publicly accessible
2. **Verify webhook enabled** - In SchoolPay portal
3. **Check subscription** - Must be active
4. **Test endpoint** - `curl -X POST https://yourdomain.com/api/v1/webhooks/schoolpay/<school_id>`

### Student Not Matched

1. **Check admission number** - Must match payment code
2. **Verify student exists** - In correct school
3. **Check student status** - Must be active
4. **Manual match** - Update `student_id` in `schoolpay_transactions`

### Transaction Not Processing

1. **Check term dates** - Payment date must fall within term
2. **Verify student fees record** - Must exist for term/year
3. **Check completion status** - Must be "Completed"
4. **Review error message** - In `schoolpay_transactions.error_message`

### Signature Verification Failed

1. **Check API password** - Must match SchoolPay portal
2. **Verify receipt number** - In webhook payload
3. **Test hash** - `echo -n "password123receipt456" | sha256sum`

## Cron Jobs (Optional)

### Daily Sync

```bash
# Sync yesterday's transactions daily at 6 AM
0 6 * * * curl -X POST https://yourdomain.com/api/v1/schoolpay/sync \
  -H "Authorization: Bearer <token>" \
  -d '{"from_date":"'$(date -d yesterday +%Y-%m-%d)'"}'
```

### Process Pending

```bash
# Process unprocessed transactions every hour
0 * * * * curl -X POST https://yourdomain.com/api/v1/schoolpay/process \
  -H "Authorization: Bearer <token>"
```

## Database Schema

### schoolpay_configs

```sql
id                CHAR(36) PRIMARY KEY
school_id         CHAR(36) UNIQUE
school_code       VARCHAR(50)
api_password      VARCHAR(255)
webhook_url       VARCHAR(500)
webhook_enabled   BOOLEAN
is_active         BOOLEAN
last_sync_at      TIMESTAMP
```

### schoolpay_transactions

```sql
id                                    CHAR(36) PRIMARY KEY
school_id                             CHAR(36)
student_id                            CHAR(36)
transaction_type                      VARCHAR(20)  -- SCHOOL_FEES, OTHER_FEES
schoolpay_receipt_number              VARCHAR(50) UNIQUE
amount                                DECIMAL(10,2)
student_payment_code                  VARCHAR(50)
student_name                          VARCHAR(255)
source_payment_channel                VARCHAR(100) -- MTN MobileMoney, Airtel Money
payment_date_and_time                 TIMESTAMP
transaction_completion_status         VARCHAR(50)
processed                             BOOLEAN
processed_at                          TIMESTAMP
fees_payment_id                       CHAR(36)
error_message                         TEXT
raw_payload                           JSON
```

## Support

- SchoolPay API Docs: https://schoolpay.co.ug/api-docs
- SchoolPay Support: support@schoolpay.co.ug
- Integration Issues: Create GitHub issue

## License

MIT License - See LICENSE file

# SchoolPay API Quick Reference

## Base URL
```
https://yourdomain.com/api/v1
```

## Authentication
All endpoints except webhook require JWT token:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Get Configuration
```http
GET /schoolpay/config
```

**Response:**
```json
{
  "id": "abc-123",
  "school_id": "school-456",
  "school_code": "123456",
  "webhook_url": "https://...",
  "webhook_enabled": true,
  "is_active": true,
  "last_sync_at": "2024-01-29T10:30:00Z"
}
```

### 2. Update Configuration
```http
PUT /schoolpay/config
Content-Type: application/json

{
  "school_code": "123456",
  "api_password": "your_secret_password",
  "webhook_url": "https://yourdomain.com/api/v1/webhooks/schoolpay/school-456",
  "webhook_enabled": true,
  "is_active": true
}
```

### 3. Sync Transactions (Single Date)
```http
POST /schoolpay/sync
Content-Type: application/json

{
  "from_date": "2024-01-29"
}
```

### 4. Sync Transactions (Date Range)
```http
POST /schoolpay/sync
Content-Type: application/json

{
  "from_date": "2024-01-01",
  "to_date": "2024-01-31"
}
```

**Note:** Max 31 days range

### 5. Get Transactions
```http
GET /schoolpay/transactions?processed=false&type=SCHOOL_FEES&from_date=2024-01-01&to_date=2024-01-31
```

**Query Parameters:**
- `processed` - true/false (optional)
- `type` - SCHOOL_FEES or OTHER_FEES (optional)
- `from_date` - YYYY-MM-DD (optional)
- `to_date` - YYYY-MM-DD (optional)

**Response:**
```json
[
  {
    "id": "txn-123",
    "school_id": "school-456",
    "student_id": "student-789",
    "transaction_type": "SCHOOL_FEES",
    "schoolpay_receipt_number": "18843014",
    "amount": 350000,
    "student_payment_code": "1005416321",
    "student_name": "John Doe",
    "source_payment_channel": "MTN MobileMoney",
    "payment_date_and_time": "2024-01-29T12:45:42Z",
    "transaction_completion_status": "Completed",
    "processed": false,
    "error_message": null
  }
]
```

### 6. Process Unprocessed Transactions
```http
POST /schoolpay/process
```

**Response:**
```json
{
  "message": "Transactions processed successfully"
}
```

### 7. Webhook (Public - No Auth)
```http
POST /webhooks/schoolpay/:school_id
Content-Type: application/json

{
  "signature": "903203ed81d54a0916dd562886cf8e69a831aaf2f81da501408e93cf25d75b08",
  "type": "SCHOOL_FEES",
  "payment": {
    "amount": "50000",
    "paymentDateAndTime": "2024-01-29 20:01:52",
    "schoolpayReceiptNumber": "18847257",
    "settlementBankCode": "TROPICAL",
    "sourceChannelTransDetail": "John Doe",
    "sourceChannelTransactionId": "TXN_9876543220",
    "sourcePaymentChannel": "MTN MobileMoney",
    "studentName": "John Doe",
    "studentPaymentCode": "1006480152",
    "studentRegistrationNumber": "HIS-252",
    "transactionCompletionStatus": "Completed"
  }
}
```

## Transaction Types

### SCHOOL_FEES
Regular tuition payments

### OTHER_FEES
Supplementary fees (uniforms, meals, transport, etc.)
- Includes `supplementaryFeeId` and `supplementaryFeeDescription`

## Payment Channels

- MTN MobileMoney
- Airtel Money

## Transaction Statuses

- `Completed` - Payment successful
- `Pending` - Payment in progress
- `Failed` - Payment failed

## Error Codes

- `400` - Bad request (invalid payload)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found (config not found)
- `500` - Internal server error

## Curl Examples

### Configure SchoolPay
```bash
curl -X PUT https://acadistra.com/api/v1/schoolpay/config \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "school_code": "123456",
    "api_password": "secret",
    "webhook_url": "https://acadistra.com/api/v1/webhooks/schoolpay/abc-123",
    "webhook_enabled": true,
    "is_active": true
  }'
```

### Sync Today's Transactions
```bash
curl -X POST https://acadistra.com/api/v1/schoolpay/sync \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d "{\"from_date\":\"$(date +%Y-%m-%d)\"}"
```

### Get Unprocessed Transactions
```bash
curl https://acadistra.com/api/v1/schoolpay/transactions?processed=false \
  -H "Authorization: Bearer eyJhbGc..."
```

### Process Pending Transactions
```bash
curl -X POST https://acadistra.com/api/v1/schoolpay/process \
  -H "Authorization: Bearer eyJhbGc..."
```

## Database Queries

### Check Configuration
```sql
SELECT * FROM schoolpay_configs WHERE school_id = 'school-456';
```

### Unprocessed Transactions
```sql
SELECT * FROM schoolpay_transactions 
WHERE school_id = 'school-456' 
AND processed = false 
AND transaction_completion_status = 'Completed';
```

### Failed Transactions
```sql
SELECT * FROM schoolpay_transactions 
WHERE school_id = 'school-456' 
AND error_message IS NOT NULL;
```

### Today's Payments
```sql
SELECT * FROM schoolpay_transactions 
WHERE school_id = 'school-456' 
AND DATE(payment_date_and_time) = CURRENT_DATE;
```

## Roles with Access

- `system_admin` - Full access
- `school_admin` - Full access for their school
- `bursar` - Full access for their school

## Notes

1. **Student Matching**: Ensure student `admission_no` matches SchoolPay `payment_code`
2. **Term Dates**: Payment date must fall within term dates for auto-processing
3. **Webhook URL**: Must be publicly accessible (no localhost)
4. **Signature**: Always verify webhook signatures for security
5. **Idempotency**: Duplicate receipts are automatically ignored
6. **Max Range**: Sync API limited to 31 days per request

## Support

- Full Docs: `SCHOOLPAY_INTEGRATION.md`
- Implementation: `SCHOOLPAY_IMPLEMENTATION.md`
- SchoolPay API: https://schoolpay.co.ug/api-docs

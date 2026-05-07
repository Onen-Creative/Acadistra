# SchoolPay Integration Setup Guide

## Overview
SchoolPay is a mobile money payment gateway for Ugandan schools. This guide explains how to configure SchoolPay integration for your school.

---

## Step 1: Get Your School ID

The School ID is a **UUID** (Universally Unique Identifier) that uniquely identifies your school in the database.

### Method 1: Via Database Query (Recommended for Admins)

```sql
-- Connect to your PostgreSQL database
psql -U postgres -d school_system_db

-- Get all schools with their IDs
SELECT id, name, contact_email FROM schools;

-- Example output:
--                   id                  |        name         |    contact_email
-- --------------------------------------+---------------------+---------------------
-- 550e8400-e29b-41d4-a716-446655440000 | St. Mary's School   | admin@stmarys.ac.ug
-- 6ba7b810-9dad-11d1-80b4-00c04fd430c8 | Kings College       | info@kings.ac.ug
```

### Method 2: Via API (For School Admins)

1. **Login to your school admin account**
2. **Make an API request** to get your school details:

```bash
curl -X GET "http://localhost:8080/api/v1/schools/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "St. Mary's School",
  "contact_email": "admin@stmarys.ac.ug",
  ...
}
```

### Method 3: Via Browser Developer Tools

1. **Login to the admin dashboard**
2. **Open Browser Developer Tools** (F12)
3. **Go to Network tab**
4. **Refresh the page**
5. **Look for API calls** - your school_id will be in the responses
6. **Check localStorage** - Run in console:
   ```javascript
   localStorage.getItem('school_id')
   ```

---

## Step 2: Get SchoolPay Credentials

Contact **SchoolPay Uganda** to get your credentials:

- **Website**: https://schoolpay.co.ug
- **Email**: support@schoolpay.co.ug
- **Phone**: +256 XXX XXX XXX

You will receive:
1. **School Code** - Your unique school identifier in SchoolPay system
2. **API Password** - Secret key for API authentication

---

## Step 3: Configure SchoolPay in Acadistra

### Option A: Via Admin Dashboard (Recommended)

1. **Login as School Admin**
2. **Navigate to**: Settings → Payment Configuration → SchoolPay
3. **Fill in the form**:
   - **School Code**: `YOUR_SCHOOLPAY_CODE`
   - **API Password**: `YOUR_SCHOOLPAY_API_PASSWORD`
   - **Webhook URL**: `https://yourdomain.com/api/v1/webhooks/schoolpay/YOUR_SCHOOL_ID`
   - **Enable Webhook**: ✅ Yes
   - **Is Active**: ✅ Yes
4. **Click Save**

### Option B: Via API

```bash
curl -X POST "http://localhost:8080/api/v1/schoolpay/config" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "school_code": "YOUR_SCHOOLPAY_CODE",
    "api_password": "YOUR_SCHOOLPAY_API_PASSWORD",
    "webhook_url": "https://yourdomain.com/api/v1/webhooks/schoolpay/550e8400-e29b-41d4-a716-446655440000",
    "webhook_enabled": true,
    "is_active": true
  }'
```

---

## Step 4: Configure Webhook in SchoolPay Portal

1. **Login to SchoolPay Portal**: https://schoolpay.co.ug/portal
2. **Navigate to**: Settings → Webhooks
3. **Add Webhook URL**:
   ```
   https://yourdomain.com/api/v1/webhooks/schoolpay/YOUR_SCHOOL_ID
   ```
   
   **Example**:
   ```
   https://acadistra.com/api/v1/webhooks/schoolpay/550e8400-e29b-41d4-a716-446655440000
   ```

4. **Select Events**:
   - ✅ Payment Success
   - ✅ Payment Failed
   - ✅ Payment Pending

5. **Save Configuration**

---

## Step 5: Assign SchoolPay Codes to Students

Each student needs a unique **SchoolPay Code** for payments.

### Bulk Assignment (Recommended)

```sql
-- Generate SchoolPay codes for all students
-- Format: SCHOOL_CODE-ADMISSION_NO
UPDATE students 
SET schoolpay_code = CONCAT('YOUR_SCHOOLPAY_CODE', '-', admission_no)
WHERE school_id = 'YOUR_SCHOOL_ID' 
  AND schoolpay_code IS NULL;

-- Example:
-- If school code is "STMARYS" and admission no is "2024001"
-- SchoolPay code will be: "STMARYS-2024001"
```

### Individual Assignment via API

```bash
curl -X PATCH "http://localhost:8080/api/v1/students/STUDENT_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schoolpay_code": "STMARYS-2024001"
  }'
```

---

## Step 6: Test the Integration

### Test Payment Flow

1. **Create a test student** with SchoolPay code
2. **Generate a payment request** via SchoolPay
3. **Make a test payment** using SchoolPay mobile app
4. **Verify webhook received**:
   ```bash
   curl -X GET "http://localhost:8080/api/v1/schoolpay/transactions?processed=false" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```
5. **Check if payment was recorded** in student fees

### Manual Sync (if webhook fails)

```bash
curl -X POST "http://localhost:8080/api/v1/schoolpay/sync" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from_date": "2024-01-01",
    "to_date": "2024-01-31"
  }'
```

---

## Webhook URL Format

The webhook URL **MUST** include your School ID:

```
https://yourdomain.com/api/v1/webhooks/schoolpay/{SCHOOL_ID}
```

### Examples:

**Development**:
```
http://localhost:3000/api/v1/webhooks/schoolpay/550e8400-e29b-41d4-a716-446655440000
```

**Production**:
```
https://acadistra.com/api/v1/webhooks/schoolpay/550e8400-e29b-41d4-a716-446655440000
```

**Subdomain (Multi-tenant)**:
```
https://stmarys.acadistra.com/api/v1/webhooks/schoolpay/550e8400-e29b-41d4-a716-446655440000
```

---

## Troubleshooting

### Issue: "Invalid school ID"
- **Solution**: Verify your School ID is a valid UUID
- **Check**: Run `SELECT id FROM schools WHERE id = 'YOUR_SCHOOL_ID';`

### Issue: "Webhook not receiving payments"
- **Solution 1**: Check webhook URL is correct in SchoolPay portal
- **Solution 2**: Verify your server is accessible from internet
- **Solution 3**: Check firewall/security group allows incoming requests
- **Solution 4**: Use manual sync as fallback

### Issue: "Authentication failed"
- **Solution**: Verify School Code and API Password are correct
- **Check**: Test credentials with SchoolPay support

### Issue: "Student not found"
- **Solution**: Ensure student has a SchoolPay code assigned
- **Check**: `SELECT schoolpay_code FROM students WHERE admission_no = 'XXX';`

---

## Security Best Practices

1. **Never expose API Password** in client-side code
2. **Use HTTPS** for webhook URLs in production
3. **Validate webhook signatures** (if SchoolPay provides them)
4. **Monitor webhook logs** for suspicious activity
5. **Rotate API credentials** periodically
6. **Restrict webhook endpoint** to SchoolPay IP addresses (if available)

---

## Database Schema Reference

### SchoolPay Configuration Table
```sql
CREATE TABLE schoolpay_configs (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL UNIQUE,
    school_code VARCHAR(50) NOT NULL,
    api_password VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(500),
    webhook_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### SchoolPay Transactions Table
```sql
CREATE TABLE schoolpay_transactions (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL,
    student_id UUID,
    schoolpay_code VARCHAR(50),
    transaction_reference VARCHAR(100) UNIQUE,
    amount DECIMAL(10,2),
    payment_date_and_time TIMESTAMP,
    transaction_type VARCHAR(50),
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    error_message TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP
);
```

---

## Support

For technical support:
- **Acadistra**: support@acadistra.com
- **SchoolPay**: support@schoolpay.co.ug

For feature requests or bug reports:
- **GitHub**: https://github.com/yourusername/acadistra/issues
- **Email**: dev@acadistra.com

---

## Additional Resources

- [SchoolPay API Documentation](https://schoolpay.co.ug/docs)
- [Acadistra API Documentation](http://localhost:8080/swagger/index.html)
- [Multi-tenant Setup Guide](DEPLOYMENT.md)
- [Security Best Practices](SECURITY.md)

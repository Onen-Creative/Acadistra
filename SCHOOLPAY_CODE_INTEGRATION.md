# SchoolPay Code Integration - Complete Implementation

## Overview
SchoolPay code has been fully integrated into the Acadistra school management system to enable seamless mobile money payment tracking via SchoolPay Uganda.

## What is SchoolPay Code?
A unique payment identifier assigned to each student by SchoolPay Uganda. Parents use this code to make mobile money payments (MTN, Airtel) which are automatically matched to the student's fee account.

---

## Implementation Summary

### 1. Database Changes
**File**: `backend/migrations/20260130000000_add_schoolpay_code_to_students.sql`
- Added `schoolpay_code` column to `students` table
- Created unique index for fast lookups
- Allows NULL values (optional field)

**Migration Command**:
```bash
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260130000000_add_schoolpay_code_to_students.sql"
```

### 2. Backend Changes

#### Models (`backend/internal/models/models.go`)
```go
type Student struct {
    // ... existing fields
    SchoolPayCode string `gorm:"type:varchar(50);uniqueIndex:idx_schoolpay_code" json:"schoolpay_code"`
    // ... other fields
}
```

#### Student Handler (`backend/internal/handlers/student_handler.go`)
- Added `SchoolPayCode` to update request struct
- Handles SchoolPay code in student updates

#### SchoolPay Service (`backend/internal/services/schoolpay_service.go`)
**Payment Matching Logic**:
1. **Primary**: Match by `schoolpay_code` (student.schoolpay_code = transaction.studentPaymentCode)
2. **Fallback**: Match by `admission_no` if SchoolPay code not found
3. **Error**: Clear message showing both identifiers if no match

#### Student Export (`backend/internal/services/student_export_service.go`)
- Added "SchoolPay Code" column to Excel exports
- Positioned after "Admission No" column

#### Student Import Template (`backend/internal/services/bulk_import_xlsx_service.go`)
- Added "SchoolPay Code" column to import template (column I)
- Updated sample data with example codes (SP001, SP002)
- Updated validation to parse SchoolPay code
- Saves SchoolPay code during bulk import

### 3. Frontend Changes

#### Student Registration Form (`frontend/src/app/students/register/page.tsx`)
- Added SchoolPay code input field
- Positioned after LIN field
- Optional field with placeholder: "Payment code for mobile money"
- Included in form submission

#### Student Edit Form (`frontend/src/app/students/[id]/edit/page.tsx`)
- Added SchoolPay code input field
- Loads existing code if present
- Updates code on form submission

#### Student Details View (`frontend/src/app/students/[id]/page.tsx`)
- Displays SchoolPay code in Basic Information section
- Shows "Not assigned" if no code exists

#### Student List Interface (`frontend/src/app/students/page.tsx`)
- Added `schoolpay_code` to TypeScript Student interface

---

## Usage Guide

### For School Administrators

#### 1. Assign SchoolPay Codes During Registration
When registering a new student:
1. Navigate to **Students → Add Student**
2. Fill in basic information
3. Enter the **SchoolPay Code** provided by SchoolPay Uganda
4. Complete registration

#### 2. Add SchoolPay Codes to Existing Students
For students already in the system:
1. Navigate to **Students** list
2. Click **Edit** on a student
3. Scroll to **Personal Information** section
4. Enter the **SchoolPay Code** field
5. Click **Update Student**

#### 3. Bulk Import with SchoolPay Codes
When importing students via Excel:
1. Navigate to **Students → Import Students**
2. Download the template
3. Fill in student data including **SchoolPay Code** column (column I)
4. Upload the completed file
5. Review and approve

**Template Column Order**:
```
A: First Name
B: Middle Name
C: Last Name
D: Date of Birth
E: Gender
F: Nationality
G: Religion
H: LIN
I: SchoolPay Code  ← NEW
J: Email
K: Phone
... (remaining columns)
```

#### 4. Export Students with SchoolPay Codes
1. Navigate to **Students** list
2. Apply filters if needed
3. Click **Export**
4. Excel file includes SchoolPay Code column

### For Parents

#### Making Payments via SchoolPay
1. Dial SchoolPay USSD code or use mobile app
2. Enter student's **SchoolPay Code**
3. Enter amount to pay
4. Confirm payment with PIN
5. Receive confirmation SMS

**Payment Flow**:
```
Parent Payment → SchoolPay → Webhook/API → Acadistra
                                              ↓
                                    Match by SchoolPay Code
                                              ↓
                                    Update Student Fees
                                              ↓
                                    Send Confirmation
```

---

## Technical Details

### Payment Processing Flow

1. **Payment Initiated**: Parent pays via SchoolPay using student's payment code

2. **Transaction Received**: SchoolPay sends transaction via:
   - **Webhook** (real-time): `POST /api/schoolpay/webhook/:school_id`
   - **API Sync** (manual): `POST /api/schoolpay/sync`

3. **Student Matching**:
   ```go
   // Try SchoolPay code first
   student := db.Where("schoolpay_code = ?", transaction.StudentPaymentCode).First()
   
   // Fallback to admission number
   if not found {
       student := db.Where("admission_no = ?", transaction.StudentRegistrationNumber).First()
   }
   ```

4. **Fee Update**:
   - Create `FeesPayment` record
   - Update `StudentFees.amount_paid`
   - Calculate `StudentFees.outstanding`
   - Mark transaction as `processed`

5. **Confirmation**: Parent receives SMS confirmation

### Database Schema

```sql
-- Students table
ALTER TABLE students ADD COLUMN schoolpay_code VARCHAR(50);
CREATE UNIQUE INDEX idx_schoolpay_code ON students(schoolpay_code) 
    WHERE schoolpay_code IS NOT NULL;

-- SchoolPay transactions table (existing)
CREATE TABLE schoolpay_transactions (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL,
    student_id UUID,  -- Matched student
    student_payment_code VARCHAR(50),  -- From SchoolPay
    amount DECIMAL(10,2),
    processed BOOLEAN DEFAULT FALSE,
    fees_payment_id UUID,  -- Link to created payment
    -- ... other fields
);
```

### API Endpoints

#### SchoolPay Integration
- `POST /api/schoolpay/webhook/:school_id` - Receive real-time payments
- `POST /api/schoolpay/sync` - Manual sync transactions
- `POST /api/schoolpay/process` - Process unprocessed transactions
- `GET /api/schoolpay/transactions` - List transactions
- `GET /api/schoolpay/config` - Get configuration
- `PUT /api/schoolpay/config` - Update configuration

#### Student Management
- `POST /api/v1/students` - Create student (includes schoolpay_code)
- `PUT /api/v1/students/:id` - Update student (includes schoolpay_code)
- `GET /api/v1/students/:id` - Get student details (includes schoolpay_code)
- `GET /api/v1/students/export` - Export students (includes schoolpay_code)

---

## Configuration

### SchoolPay Setup
1. Navigate to **Finance → SchoolPay → Configuration**
2. Enter:
   - **School Code**: Provided by SchoolPay
   - **API Password**: Provided by SchoolPay
   - **Webhook URL**: `https://yourdomain.com/api/schoolpay/webhook/:school_id`
3. Enable webhook
4. Save configuration

### Environment Variables
```bash
# .env.production
SCHOOLPAY_ENABLED=true
SCHOOLPAY_BASE_URL=https://schoolpay.co.ug/paymentapi
```

---

## Testing

### Test Payment Flow
1. Create test student with SchoolPay code "TEST001"
2. Use SchoolPay sandbox to make test payment
3. Verify transaction appears in **Finance → SchoolPay → Transactions**
4. Click **Process Transactions**
5. Verify fee payment created in **Finance → Student Fees**

### Manual Sync Test
1. Navigate to **Finance → SchoolPay → Transactions**
2. Click **Sync Transactions**
3. Select date range
4. Click **Sync**
5. Verify transactions imported

---

## Troubleshooting

### Payment Not Matching Student

**Problem**: Transaction received but student not found

**Solutions**:
1. Check SchoolPay code is correctly entered in student profile
2. Verify SchoolPay code matches exactly (case-sensitive)
3. Check transaction details in **SchoolPay → Transactions**
4. Look at `error_message` field for details

**Query to find unmatched transactions**:
```sql
SELECT * FROM schoolpay_transactions 
WHERE student_id IS NULL 
AND processed = false;
```

### Duplicate SchoolPay Codes

**Problem**: Cannot save student - duplicate SchoolPay code

**Solution**:
```sql
-- Find duplicate codes
SELECT schoolpay_code, COUNT(*) 
FROM students 
WHERE schoolpay_code IS NOT NULL 
GROUP BY schoolpay_code 
HAVING COUNT(*) > 1;

-- Update duplicate
UPDATE students 
SET schoolpay_code = 'NEW_CODE' 
WHERE id = 'student_uuid';
```

### Import Template Issues

**Problem**: Import fails with header validation error

**Solution**:
- Ensure column I is labeled "SchoolPay Code" exactly
- Do not remove or reorder columns
- Download fresh template if unsure

---

## Best Practices

### 1. SchoolPay Code Assignment
- Assign codes during initial registration
- Use consistent format (e.g., SP001, SP002, SP003)
- Keep codes short and memorable for parents
- Document codes in student records

### 2. Payment Reconciliation
- Run daily sync to catch missed webhooks
- Process unprocessed transactions regularly
- Review error messages for failed matches
- Keep SchoolPay codes up to date

### 3. Parent Communication
- Include SchoolPay code on report cards
- Send codes via SMS to parents
- Display codes in parent portal
- Provide clear payment instructions

### 4. Data Management
- Export student list with codes for backup
- Validate codes before bulk import
- Check for duplicates regularly
- Update codes when students transfer

---

## Security Considerations

1. **Webhook Signature Verification**: All webhooks verified using SHA256 signature
2. **API Password**: Stored securely, never exposed in responses
3. **Transaction Idempotency**: Duplicate transactions ignored (by receipt number)
4. **Audit Trail**: All transactions logged with raw payload
5. **Access Control**: Only authorized roles can process transactions

---

## Support

### Common Questions

**Q: Can multiple students share the same SchoolPay code?**
A: No, SchoolPay codes must be unique per student.

**Q: What happens if SchoolPay code is not assigned?**
A: System falls back to matching by admission number.

**Q: Can I change a student's SchoolPay code?**
A: Yes, edit the student and update the code. Ensure new code is unique.

**Q: How long does it take for payments to reflect?**
A: Real-time via webhook (instant) or next manual sync (up to 24 hours).

**Q: What if a payment matches the wrong student?**
A: Contact support immediately. Transaction can be reversed and reassigned.

---

## Deployment Checklist

- [ ] Run database migration
- [ ] Restart backend service
- [ ] Clear frontend cache
- [ ] Test student registration with SchoolPay code
- [ ] Test student edit with SchoolPay code
- [ ] Download and verify import template
- [ ] Test bulk import with SchoolPay codes
- [ ] Export students and verify SchoolPay code column
- [ ] Configure SchoolPay credentials
- [ ] Test webhook endpoint
- [ ] Test manual sync
- [ ] Process test transaction
- [ ] Verify fee payment creation
- [ ] Train staff on new field
- [ ] Update parent communication materials

---

## Version History

**v1.0.0** - Initial SchoolPay code integration
- Added schoolpay_code field to students
- Updated all forms (register, edit, view)
- Updated import/export templates
- Integrated with SchoolPay payment processing
- Added comprehensive documentation

---

**Built for Ugandan Schools** 🇺🇬 | SchoolPay Integration Complete ✅

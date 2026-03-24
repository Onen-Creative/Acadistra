# Password Reset System Documentation

## Overview

The system has a **self-service password reset** feature that allows users to reset their passwords via email without admin intervention.

## How It Works

### 1. User Requests Password Reset

**Frontend:** `/reset-password` page

**User Flow:**
1. User goes to login page
2. Clicks "Forgot Password?" link
3. Enters their email address
4. Clicks "Request Password Reset"

**Backend Process:**
- Validates email exists in database
- Generates secure random token (64 characters)
- Stores token in `password_resets` table with 24-hour expiry
- Sends password reset email with reset link
- Returns success message (doesn't reveal if email exists for security)

**API Endpoint:**
```
POST /api/v1/auth/password-reset/request
Body: { "email": "user@school.com" }
```

### 2. User Receives Email

**Email Contains:**
- Personalized greeting with user's name
- Reset password button/link
- Link format: `https://acadistra.com/reset-password?token=<64-char-token>`
- Expiry notice (24 hours)
- Security notice (ignore if not requested)

**Email Template:** HTML formatted with Acadistra branding

### 3. User Clicks Reset Link

**Frontend:** `/reset-password?token=<token>` page

**User Flow:**
1. User clicks link in email
2. Redirected to reset password page with token pre-filled
3. Enters new password (minimum 8 characters)
4. Confirms new password
5. Clicks "Reset Password"

**Backend Process:**
- Validates token exists and not expired
- Finds associated user
- Hashes new password with Argon2id
- Updates user's password
- Deletes used token (one-time use)
- Returns success message

**API Endpoint:**
```
POST /api/v1/auth/password-reset/confirm
Body: { 
  "token": "64-char-token",
  "new_password": "NewPassword@123"
}
```

### 4. User Logs In

User can now login with their new password.

## Database Schema

**Table:** `password_resets`

| Column      | Type      | Description                          |
|-------------|-----------|--------------------------------------|
| id          | UUID      | Primary key                          |
| user_id     | UUID      | Foreign key to users table           |
| token       | VARCHAR   | Unique 64-character reset token      |
| expires_at  | TIMESTAMP | Token expiry (24 hours from creation)|
| created_at  | TIMESTAMP | When token was created               |

**Indexes:**
- `user_id` - For quick user lookup
- `expires_at` - For cleanup of expired tokens
- `token` - Unique constraint for security

## Security Features

✅ **Token Security:**
- 64-character random hex token (256 bits of entropy)
- One-time use (deleted after successful reset)
- 24-hour expiry
- Stored in database, not in URL permanently

✅ **Email Validation:**
- Doesn't reveal if email exists (prevents user enumeration)
- Always returns success message

✅ **Password Requirements:**
- Minimum 8 characters
- Hashed with Argon2id (industry standard)
- Same security as regular passwords

✅ **Rate Limiting:**
- Should be implemented on `/password-reset/request` endpoint
- Prevents brute force attacks

## Configuration

**Email Settings** (`.env` file):
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@acadistra.com
```

**Reset Link Domain:**
- Currently hardcoded: `https://acadistra.com`
- Update in `password_reset_handler.go` line 52 for custom domain

## Frontend Pages

### 1. Login Page
- Has "Forgot Password?" link
- Links to `/reset-password`

### 2. Reset Password Request Page (`/reset-password`)
- Email input field
- Submit button
- Success message after submission
- Back to login link

### 3. Reset Password Confirm Page (`/reset-password?token=<token>`)
- Token auto-filled from URL
- New password input
- Confirm password input
- Submit button
- Success/error messages

## Admin Features

### Manual Password Reset (Alternative)

If email system is down or user doesn't have email access, admins can manually reset passwords:

**Option 1: Via Staff Page**
1. Go to Staff page
2. Find the user
3. Click Edit
4. (Feature to add: Password reset button)

**Option 2: Via Database**
```sql
-- Generate new password hash (use Argon2id)
-- Then update user:
UPDATE users 
SET password_hash = '<new-argon2id-hash>' 
WHERE email = 'user@school.com';
```

**Option 3: Via Backend Command** (Recommended to add)
```bash
./main reset-password user@school.com NewPassword@123
```

## Troubleshooting

### User Not Receiving Email

**Check:**
1. SMTP settings in `.env` are correct
2. Email service is running
3. Check spam/junk folder
4. Verify email exists in database
5. Check email queue: `SELECT * FROM email_queue WHERE to_email = 'user@school.com';`

**Solution:**
- Admin can manually reset password
- Check email service logs
- Test SMTP connection

### Token Expired

**Error:** "Invalid or expired reset token"

**Cause:** Token older than 24 hours

**Solution:**
- User requests new reset link
- Tokens auto-expire for security

### Token Already Used

**Error:** "Invalid or expired reset token"

**Cause:** Token was already used to reset password

**Solution:**
- User requests new reset link
- Tokens are one-time use for security

### Email Not Found

**Response:** "If email exists, password reset link has been sent"

**Cause:** Email doesn't exist in database (but message doesn't reveal this)

**Solution:**
- User checks email spelling
- User contacts admin to verify account
- Admin checks if user exists

## Maintenance

### Cleanup Expired Tokens

Expired tokens should be cleaned up periodically:

**Manual Cleanup:**
```sql
DELETE FROM password_resets WHERE expires_at < NOW();
```

**Automated Cleanup** (Recommended to add):
- Cron job running daily
- Or cleanup on each new request
- Or background job every hour

## Future Enhancements

### Recommended Additions:

1. **Rate Limiting**
   - Limit requests per IP/email
   - Prevent abuse

2. **Admin Password Reset**
   - Button on staff edit page
   - Generates temporary password
   - Sends email to user

3. **Password History**
   - Prevent reusing last 5 passwords
   - Store password hashes history

4. **Two-Factor Authentication**
   - SMS or authenticator app
   - Extra security layer

5. **Password Strength Meter**
   - Visual feedback on password strength
   - Enforce strong passwords

6. **Audit Logging**
   - Log all password reset attempts
   - Track successful/failed resets

## Testing

### Test Password Reset Flow:

1. **Request Reset:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@school.com"}'
```

2. **Check Database:**
```sql
SELECT * FROM password_resets WHERE user_id = (SELECT id FROM users WHERE email = 'test@school.com');
```

3. **Confirm Reset:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{"token":"<token-from-db>","new_password":"NewPassword@123"}'
```

4. **Test Login:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@school.com","password":"NewPassword@123"}'
```

## Summary

✅ **Fully Functional** - Password reset system is complete and working
✅ **Secure** - Uses industry-standard security practices
✅ **User-Friendly** - Simple 3-step process
✅ **Email-Based** - Automated email delivery
✅ **Self-Service** - No admin intervention needed

**Default Flow:** User forgets password → Requests reset → Receives email → Clicks link → Sets new password → Logs in ✨

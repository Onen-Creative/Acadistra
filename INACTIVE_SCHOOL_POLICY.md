# Inactive School Policy

## Overview
This document describes how the system handles inactive schools and user access control.

## Policy Rules

### 1. User Creation
❌ **Users CANNOT be created for inactive schools**
- System admins cannot create school_admin users for inactive schools
- School admins cannot create users for their school if it's inactive
- Staff registration is also blocked for inactive schools
- Error message: "Cannot create users for inactive schools. Please activate the school first"
- Schools must be activated before any users can be created

### 2. User Login
❌ **Users CANNOT login if their school is inactive**
- Login attempts will be blocked with a clear error message
- Error message: "Your school is currently inactive. Please contact your school administrator"
- This applies to all roles except:
  - `system_admin` - Can always login (no school association)
  - `parent` - Can login (may need access to view historical data)

### 3. Token Refresh
❌ **Tokens CANNOT be refreshed if school becomes inactive**
- If a school is deactivated while users are logged in
- Their tokens will not refresh when they expire
- They will be logged out automatically
- Same error message as login

## Implementation Details

### Backend Changes

#### 1. Auth Service (`auth_service.go`)
**Login Method (Line 76-82):**
```go
if !user.IsActive {
    return nil, nil, ErrUserNotActive
}

// Check if school is active (except for system_admin and parent)
if user.Role != "system_admin" && user.Role != "parent" && user.School != nil && !user.School.IsActive {
    return nil, nil, errors.New("your school is currently inactive. Please contact your school administrator")
}
```

**Parent Login (Line 133-139):**
```go
if !user.IsActive {
    return nil, nil, ErrUserNotActive
}

// Check if school is active for parent users
if user.School != nil && !user.School.IsActive {
    return nil, nil, errors.New("your school is currently inactive. Please contact your school administrator")
}
```

**Token Refresh (Line 280-287):**
```go
if !user.IsActive {
    return nil, ErrUserNotActive
}

// Check if school is active (except for system_admin and parent)
if user.Role != "system_admin" && user.Role != "parent" && user.School != nil && !user.School.IsActive {
    return nil, errors.New("your school is currently inactive. Please contact your school administrator")
}
```

#### 2. User Service (`user_service.go`)
**CreateSystemAdmin Method:**
```go
// Check if school is active
if !school.IsActive {
    return nil, "", fmt.Errorf("cannot create users for inactive schools. Please activate the school first")
}
```

**CreateSchoolUser Method:**
```go
// Check if school is active
if !school.IsActive {
    return nil, fmt.Errorf("cannot create users for inactive schools. Please activate the school first")
}
```

#### 3. Staff Service (`staff_service.go`)
**CreateStaff Method:**
```go
// Check if school is active
if !school.IsActive {
    return fmt.Errorf("cannot create staff for inactive schools. Please activate the school first")
}
```

### Frontend Changes
- Login page already displays backend error messages
- No additional changes needed

## Use Cases

### Use Case 1: New School Setup
1. System admin creates a new school (inactive by default)
2. System admin activates the school
3. System admin creates school_admin user for the school
4. School admin can now login and set up the school
5. School admin can create additional users and staff

### Use Case 2: School Suspension
1. System admin deactivates a school
2. Currently logged-in users continue working until their tokens expire
3. When tokens expire, refresh will fail with inactive school error
4. Users are logged out automatically
5. New login attempts are blocked with clear error message

### Use Case 3: School Reactivation
1. System admin reactivates the school
2. All users can immediately login again
3. No data is lost during inactive period

## Testing

### Test Scenario 1: Create User for Inactive School
```bash
# 1. Deactivate a school
PATCH /api/v1/schools/{school_id}/toggle-active

# 2. Try to create a user for that school (should fail)
POST /api/v1/users
{
  "email": "newuser@school.com",
  "password": "Password123",
  "full_name": "New User",
  "role": "school_admin",
  "school_id": "{school_id}"
}

# Expected: 400 Bad Request
# Error: "cannot create users for inactive schools. Please activate the school first"
```

### Test Scenario 2: Login with Inactive School
```bash
# 1. Try to login as user from inactive school
POST /api/v1/auth/login
{
  "email": "user@inactiveschool.com",
  "password": "Password123"
}

# Expected: 401 Unauthorized
# Error: "your school is currently inactive. Please contact your school administrator"
```

### Test Scenario 3: Token Refresh with Inactive School
```bash
# 1. User is logged in
# 2. School is deactivated
# 3. User's access token expires
# 4. Frontend tries to refresh token

POST /api/v1/auth/refresh
{
  "refresh_token": "..."
}

# Expected: 401 Unauthorized
# Error: "your school is currently inactive. Please contact your school administrator"
```

## Security Considerations

1. **System Admin Bypass**: System admins can always login regardless of school status
2. **Parent Access**: Parents can login even if school is inactive (to view historical data)
3. **Automatic Logout**: Users are automatically logged out when school becomes inactive
4. **Clear Communication**: Error messages clearly explain why login failed

## Future Enhancements

1. **Grace Period**: Allow a grace period before blocking logins after deactivation
2. **Email Notifications**: Notify users when their school is deactivated
3. **Read-Only Access**: Allow read-only access for inactive schools
4. **Scheduled Deactivation**: Schedule school deactivation for a future date

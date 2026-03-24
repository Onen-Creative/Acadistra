# User Creation Guide - Acadistra

## Overview
To avoid duplicate records and maintain data integrity, user accounts are created through **Staff Registration** for all roles except School Admin.

## User Creation Methods

### 1. Staff Registration (PRIMARY METHOD) ✅
**Path**: Staff → Register New Staff

**Use for these roles:**
- ✅ Teacher
- ✅ Bursar
- ✅ Librarian
- ✅ Nurse
- ✅ Store Keeper

**What gets created:**
1. Staff record (with HR details: salary, bank info, qualifications, etc.)
2. User account (for system login)
3. TeacherProfile (for Teachers only - enables class assignment)

**Login credentials:**
- Email: The email entered during registration
- Password: `Teacher@123` (default - should be changed after first login)

**Benefits:**
- Complete HR records
- Single source of truth
- No duplicate accounts
- Teachers can be assigned as class teachers
- Proper role mapping

---

### 2. User Management (SECONDARY METHOD)
**Path**: Users → Add User

**Use for these roles ONLY:**
- Security
- Cleaner
- Cook
- Driver
- Gardener
- Maintenance
- Receptionist

**Note**: These roles do NOT get system login access. They are for record-keeping only.

---

### 3. School Admin Creation
**Path**: System Admin → Schools → Create School Admin

**Special case:**
- School Admin is created separately
- Can be edited later to add HR details if needed
- Has full school management access

---

## Login Access Control

### Roles that CAN login:
1. ✅ System Admin
2. ✅ School Admin
3. ✅ Teacher
4. ✅ Bursar
5. ✅ Librarian
6. ✅ Nurse
7. ✅ Store Keeper
8. ✅ Parent

### Roles that CANNOT login:
- ❌ Security
- ❌ Cook
- ❌ Cleaner
- ❌ Driver
- ❌ Gardener
- ❌ Maintenance
- ❌ Receptionist
- ❌ Other staff roles

---

## Staff Role to User Role Mapping

| Staff Role | User Role | Can Login? | Has TeacherProfile? |
|------------|-----------|------------|---------------------|
| Teacher | teacher | ✅ Yes | ✅ Yes |
| Bursar | bursar | ✅ Yes | ❌ No |
| Librarian | librarian | ✅ Yes | ❌ No |
| Nurse | nurse | ✅ Yes | ❌ No |
| Store Keeper | store_keeper | ✅ Yes | ❌ No |
| Security | (none) | ❌ No | ❌ No |
| Cook | (none) | ❌ No | ❌ No |
| Cleaner | (none) | ❌ No | ❌ No |
| Driver | (none) | ❌ No | ❌ No |
| Others | (none) | ❌ No | ❌ No |

---

## Workflow Examples

### Example 1: Creating a Teacher
1. Go to **Staff → Register New Staff**
2. Fill in all details (name, email, phone, qualifications, etc.)
3. Select Role: **Teacher**
4. Submit
5. **Result**: 
   - Staff record created
   - User account created (role: teacher)
   - TeacherProfile created
   - Can login with email and `Teacher@123`
   - Can be assigned as class teacher

### Example 2: Creating a Bursar
1. Go to **Staff → Register New Staff**
2. Fill in all details
3. Select Role: **Bursar**
4. Submit
5. **Result**:
   - Staff record created
   - User account created (role: bursar)
   - Can login with email and `Teacher@123`
   - Can access finance modules

### Example 3: Creating a Security Guard
1. Go to **Staff → Register New Staff**
2. Fill in all details
3. Select Role: **Security**
4. Submit
5. **Result**:
   - Staff record created
   - NO user account created
   - Cannot login (record-keeping only)

---

## Error Prevention

### Backend Validation
The system prevents duplicate creation:

```
❌ Error: "Users with role teacher must be created via Staff Registration"
```

This error appears if you try to create a Teacher, Bursar, Librarian, Nurse, or Store Keeper through the User Management page.

### Frontend Guidance
- User Management page shows: "⚠️ For Teachers, Bursar, Librarian, Nurse, or Store Keeper, use Staff Registration instead."
- "Register Staff (Recommended)" button prominently displayed

---

## Best Practices

1. ✅ **Always use Staff Registration** for roles that need system access
2. ✅ **Collect complete HR information** during staff registration
3. ✅ **Inform new users** to change their default password after first login
4. ✅ **Use User Management** only for non-system roles (security, cook, etc.)
5. ✅ **Verify email addresses** before creating accounts
6. ✅ **Assign class teachers** only after creating them via Staff Registration

---

## Troubleshooting

### Problem: Teacher cannot login
**Solution**: Check if teacher was created via Staff Registration (not User Management)

### Problem: Teacher not appearing in class teacher dropdown
**Solution**: Ensure teacher has a TeacherProfile (created automatically via Staff Registration)

### Problem: "Role does not have system access" error
**Solution**: User role is not in the allowed list (security, cook, etc. cannot login)

### Problem: Duplicate user error
**Solution**: Check if user already exists in Staff or Users table

---

## Summary

| Need | Use This Method |
|------|----------------|
| Teacher with class assignment | Staff Registration |
| Bursar for finance | Staff Registration |
| Librarian for library | Staff Registration |
| Nurse for clinic | Staff Registration |
| Store Keeper for inventory | Staff Registration |
| Security guard (record only) | Staff Registration |
| Cook (record only) | Staff Registration |
| School Admin | System Admin → Create School Admin |

**Remember**: Staff Registration is the PRIMARY method for creating all staff members!

# User to Staff Migration Guide

## Overview
This migration creates staff records for all existing users who don't have staff records yet. This ensures all users appear on the Staff page in the UI.

## When to Run This Migration

Run this migration **ONCE** after deploying the new code to your VPS if you have existing users created via the old user management page.

## What It Does

1. **Finds users without staff records** - Queries all users (except system_admin and parent) who don't have corresponding staff records
2. **Creates staff records** - For each user found:
   - Parses full name into first, middle, and last names
   - Generates unique employee ID (STF0001, STF0002, etc.)
   - Maps user role to staff role
   - Creates staff record linked to user account
   - Creates TeacherProfile for teachers
3. **Reports results** - Shows success/failure count

## How to Run

### On Your VPS (Production):

```bash
# Navigate to backend directory
cd /path/to/backend

# Run the migration
./main migrate-users-to-staff
```

### Locally (Development):

```bash
# Navigate to backend directory
cd backend

# Run the migration
go run cmd/api/main.go migrate-users-to-staff
```

## Expected Output

```
🔍 Starting migration: Creating staff records for users without staff records...
📋 Found 5 users without staff records:

👤 Processing user: John Doe (john@school.com) - Role: teacher
   ✅ Created staff record (ID: STF0001) and teacher profile

👤 Processing user: Jane Smith (jane@school.com) - Role: bursar
   ✅ Created staff record (ID: STF0002)

============================================================
📊 Migration Summary:
   ✅ Successfully migrated: 5 users
============================================================
✨ Migration completed!
```

## Role Mapping

The migration automatically maps user roles to staff roles:

| User Role      | Staff Role    |
|----------------|---------------|
| teacher        | Teacher       |
| bursar         | Bursar        |
| librarian      | Librarian     |
| nurse          | Nurse         |
| store_keeper   | Store Keeper  |
| school_admin   | Admin         |
| security       | Security      |
| cleaner        | Cleaner       |
| cook           | Cook          |
| driver         | Driver        |
| gardener       | Gardener      |
| maintenance    | Maintenance   |
| receptionist   | Receptionist  |

## What Happens After Migration

✅ **All users appear on Staff page** - Users can now be viewed, edited, and managed from the Staff page

✅ **Login credentials unchanged** - All existing passwords remain valid

✅ **Full staff functionality** - Users now have access to all staff features (leave requests, attendance, documents, etc.)

✅ **Teacher profiles created** - Teachers automatically get TeacherProfile records for class assignment

## Safety

- ✅ **Idempotent** - Safe to run multiple times (skips users who already have staff records)
- ✅ **Non-destructive** - Only creates new records, doesn't modify or delete existing data
- ✅ **Rollback-friendly** - If needed, you can delete the created staff records and re-run

## Troubleshooting

### "No users found without staff records"
This means all your users already have staff records. Migration not needed.

### "Failed to create staff record"
Check the error message. Common causes:
- Duplicate employee_id (shouldn't happen with auto-generation)
- Missing school_id on user
- Database connection issues

### Users still not showing on Staff page
1. Verify migration ran successfully
2. Check that staff records were created: `SELECT * FROM staff;`
3. Verify user_id is linked: `SELECT * FROM staff WHERE user_id IS NOT NULL;`
4. Clear browser cache and refresh

## After Migration

Once migration is complete:
- ✅ All future staff should be created via **Staff Registration** page
- ✅ Staff Registration automatically creates both User and Staff records
- ✅ No need to use the old user management page anymore

# Post-Migration Cleanup Instructions

## After Successfully Running the Migration

Once you've confirmed the migration worked successfully (all users appear on Staff page), you can optionally remove the migration code.

### Steps to Remove Migration Code:

1. **Remove the command case from main.go:**
   - Open `backend/cmd/api/main.go`
   - Find and delete the case in `handleCommand()`:
   ```go
   case "migrate-users-to-staff":
       migrateUsersToStaff(db)
   ```

2. **Remove the migration functions from main.go:**
   - Delete these three functions at the end of `main.go`:
     - `migrateUsersToStaff()`
     - `parseFullName()`
     - `mapUserRoleToStaffRole()`

3. **Remove the migration script:**
   ```bash
   rm backend/scripts/migrate_users_to_staff.go
   ```

4. **Archive the migration guide:**
   ```bash
   mkdir -p docs/completed-migrations
   mv MIGRATION_USERS_TO_STAFF.md docs/completed-migrations/
   ```

### Verification After Removal:

```bash
# Rebuild the application
cd backend
go build -o main cmd/api/main.go

# Verify it still runs
./main
```

## Recommendation

**I recommend keeping the migration code** for at least 1-2 months after deployment because:
- It doesn't affect performance
- Provides safety net if issues arise
- Useful if you need to re-run for any reason
- Can help other schools during their initial setup

After 1-2 months of stable operation, you can safely remove it following the steps above.

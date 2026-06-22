# SOLUTION: Classes Not Showing for Term 2/Term 3

## Problem Summary
- ❌ View Marks page: No classes when Term 2 selected
- ❌ Reports page: No classes when Term 2 selected  
- ❌ Attendance page: No classes when Term 2 selected
- ✅ Mark Entry page: Works correctly (accepts term changes)

## Root Cause
**The database migration has NOT been run on the live server.**

The code is updated to use yearly classes, but the database still has the old schema with a `term` column in the `classes` table. When filtering by `term=2`, it finds no matching classes because:
- Classes were only created for Term 1
- Query filters by `term='2'` which doesn't exist

## The Fix (3 Steps)

### Option 1: Automated (Recommended)
```bash
# On your live server
cd /path/to/acadistra
./deploy_yearly_classes.sh
```

This script will:
1. ✅ Backup database automatically
2. ✅ Run the migration
3. ✅ Verify success
4. ✅ Restart services

### Option 2: Manual
```bash
# 1. Backup (CRITICAL!)
docker exec acadistra_db pg_dump -U postgres school_system_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migration
docker exec acadistra_backend ./main migrate

# 3. Verify
docker exec acadistra_db psql -U postgres -d school_system_db -c "\d classes"
# Should NOT show 'term' column

# 4. Restart
docker restart acadistra_backend
```

### Option 3: Direct SQL
```bash
# 1. Backup first!
docker exec acadistra_db pg_dump -U postgres school_system_db > backup.sql

# 2. Run migration SQL
docker exec acadistra_db psql -U postgres -d school_system_db <<EOF
-- Drop old indexes
DROP INDEX IF EXISTS idx_class_school_year_term;

-- Remove term column
ALTER TABLE classes DROP COLUMN IF EXISTS term;

-- Create new unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_unique ON classes(school_id, level, stream, year);

-- Create new index
CREATE INDEX IF NOT EXISTS idx_class_school_year ON classes(school_id, year);
EOF

# 3. Restart
docker restart acadistra_backend
```

## What This Changes

### Before Migration
```
Classes Table:
ID | name      | level | year | term | stream
---+-----------+-------+------+------+--------
1  | P1 Blue   | P1    | 2024 | 1    | Blue
2  | P1 Red    | P1    | 2024 | 1    | Red
```
❌ No Term 2 or Term 3 classes exist

### After Migration
```
Classes Table:
ID | name      | level | year | stream
---+-----------+-------+------+--------
1  | P1 Blue   | P1    | 2024 | Blue
2  | P1 Red    | P1    | 2024 | Red
```
✅ Same classes work for ALL terms (1, 2, 3)

## Verification Steps

After running migration:

1. **Check database**:
   ```bash
   docker exec acadistra_db psql -U postgres -d school_system_db -c "\d classes"
   ```
   ✅ Should NOT show 'term' column

2. **Test API**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://yourserver.com/api/classes?year=2024&term=2"
   ```
   ✅ Should return classes (not empty)

3. **Test UI**:
   - Open View Marks page
   - Select Term 2
   - ✅ Classes should appear

## Expected Results

After migration, ALL these should work:
- ✅ View Marks → Term 2 → Shows classes
- ✅ View Marks → Term 3 → Shows classes
- ✅ Attendance → Term 2 → Shows classes
- ✅ Attendance → Term 3 → Shows classes
- ✅ Reports → Term 2 → Shows classes
- ✅ Reports → Term 3 → Shows classes

## Rollback (If Needed)

If something goes wrong:
```bash
# Restore from backup
docker exec -i acadistra_db psql -U postgres -d school_system_db < backup_YYYYMMDD_HHMMSS.sql

# Restart services
docker restart acadistra_backend
```

## Why This Happened

1. ✅ Code was updated to use yearly classes
2. ✅ Migration file was created
3. ❌ Migration was NOT run on live server
4. ❌ Database still has old schema with `term` column

## Files for Reference

- `DEPLOY_YEARLY_CLASSES.md` - Detailed deployment guide
- `deploy_yearly_classes.sh` - Automated deployment script
- `migrations/20260702000000_make_classes_yearly.sql` - Migration file
- `TERM_FILTER_FIX.md` - Explanation of the issue

## Timeline

- **Backup**: 2-5 minutes
- **Migration**: 1-2 minutes
- **Verification**: 3 minutes
- **Total**: ~10 minutes

## Questions?

**Q: Will existing data be lost?**
A: No. Existing classes remain, they just lose the `term` field and become yearly.

**Q: What about Term 1 data?**
A: All existing data is preserved. Term 1 classes become yearly classes.

**Q: Do students need re-enrollment?**
A: No. Existing enrollments remain in the `enrollments` table with their term values.

**Q: Can I run this during school hours?**
A: Yes, but it's safer during off-peak hours. Migration takes ~1-2 minutes.

---

## TL;DR - Quick Fix

```bash
# SSH to server
ssh your-server

# Go to project directory
cd /path/to/acadistra

# Run deployment script
./deploy_yearly_classes.sh

# Test: Go to View Marks → Select Term 2 → Should show classes ✅
```

**Status**: Ready to deploy 🚀

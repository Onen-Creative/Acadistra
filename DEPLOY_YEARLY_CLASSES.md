# URGENT: Deploy Yearly Class System to Live Server

## Problem
Multiple pages (View Marks, Reports, Attendance) show no classes when Term 2 or Term 3 is selected.

## Root Cause
The **database migration hasn't been run** on the live server. The `classes` table still has a `term` column, so queries filter by term and find no classes for Term 2/3.

## Solution: Run the Migration

### Step 1: Backup Database (CRITICAL)
```bash
# SSH into live server
ssh your-server

# Backup current database
docker exec acadistra_db pg_dump -U postgres school_system_db > backup_before_yearly_classes_$(date +%Y%m%d_%H%M%S).sql

# Or use the backup script
cd /path/to/acadistra
./scripts/backup.sh
```

### Step 2: Check Current State
```bash
# Check if term column exists in classes table
docker exec acadistra_db psql -U postgres -d school_system_db -c "\d classes"

# If you see 'term' column, migration hasn't run yet
# Expected output should NOT have 'term' column after migration
```

### Step 3: Verify Current Classes
```bash
# See how many classes exist per term
docker exec acadistra_db psql -U postgres -d school_system_db -c \
  "SELECT term, level, COUNT(*) FROM classes WHERE year = 2024 GROUP BY term, level ORDER BY level, term;"

# This will show if you have separate classes for each term
# Example output:
#  term | level | count
# ------+-------+-------
#   1   |  P1   |   3
#   2   |  P1   |   0      <- No Term 2 classes = problem!
#   3   |  P1   |   0      <- No Term 3 classes = problem!
```

### Step 4: Run the Migration
```bash
# Option A: Using the migrate command
docker exec acadistra_backend ./main migrate

# Option B: Run migration file directly
docker exec acadistra_db psql -U postgres -d school_system_db \
  -f /app/migrations/20260702000000_make_classes_yearly.sql

# Or from host if migrations mounted:
docker exec -i acadistra_db psql -U postgres -d school_system_db < \
  backend/migrations/20260702000000_make_classes_yearly.sql
```

### Step 5: Verify Migration Success
```bash
# Check classes table schema - should NOT have 'term' column
docker exec acadistra_db psql -U postgres -d school_system_db -c "\d classes"

# Check unique constraint exists
docker exec acadistra_db psql -U postgres -d school_system_db -c \
  "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'classes';"

# Should show: idx_class_unique on (school_id, level, stream, year)
```

### Step 6: Verify Classes Work for All Terms
```bash
# Test API endpoint (replace with your domain and token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://yourdomain.com/api/classes?year=2024&term=2"

# Should return classes (not empty)
```

### Step 7: Handle Existing Data

After migration, you'll have classes for Term 1 only (if that's when you created them). You need to:

**Option A: Keep existing Term 1 classes for all terms** (Recommended if Term 1 already has data)
```sql
-- No action needed - existing classes automatically work for all terms
-- Just ensure students are enrolled for Term 2 and Term 3

-- Check enrollments
SELECT class_id, term, COUNT(*) as student_count 
FROM enrollments 
WHERE year = 2024 
GROUP BY class_id, term;
```

**Option B: If you have duplicate classes per term, merge them**
```sql
-- Find duplicate classes (same level/stream but different terms)
SELECT school_id, level, stream, year, COUNT(*) 
FROM classes 
GROUP BY school_id, level, stream, year 
HAVING COUNT(*) > 1;

-- This would need custom migration based on your data
```

## Post-Migration Checklist

- [ ] Database backed up
- [ ] Migration run successfully
- [ ] `term` column removed from classes table
- [ ] Unique constraint `idx_class_unique` exists
- [ ] Classes appear on Term 2 selection
- [ ] Classes appear on Term 3 selection
- [ ] Attendance page shows classes for all terms
- [ ] Reports page shows classes for all terms
- [ ] View marks page shows classes for all terms
- [ ] Enrollments have correct term values
- [ ] No duplicate classes exist

## Expected Results

### Before Migration
```sql
SELECT id, name, level, year, term FROM classes WHERE level = 'P1';
```
Output:
```
      id      |    name     | level | year | term
--------------+-------------+-------+------+------
 uuid-1       | P1 Blue     |  P1   | 2024 |  1
 uuid-2       | P1 Red      |  P1   | 2024 |  1
```

### After Migration
```sql
SELECT id, name, level, year FROM classes WHERE level = 'P1';
```
Output (no 'term' column):
```
      id      |    name     | level | year
--------------+-------------+-------+------
 uuid-1       | P1 Blue     |  P1   | 2024
 uuid-2       | P1 Red      |  P1   | 2024
```

These same classes are now used for Term 1, Term 2, and Term 3.

## Rollback Plan (If Something Goes Wrong)

```bash
# Restore from backup
docker exec -i acadistra_db psql -U postgres -d school_system_db < backup_before_yearly_classes_YYYYMMDD_HHMMSS.sql

# Restart services
docker-compose restart
```

## Common Issues & Solutions

### Issue 1: Migration file not found
```bash
# Check if migration file exists
docker exec acadistra_backend ls -la migrations/ | grep yearly

# If not found, copy it manually
docker cp backend/migrations/20260702000000_make_classes_yearly.sql acadistra_backend:/app/migrations/
```

### Issue 2: Permission denied
```bash
# Run as postgres user
docker exec -u postgres acadistra_db psql -d school_system_db -f /path/to/migration.sql
```

### Issue 3: Column doesn't exist errors after migration
```bash
# Restart backend to reload code
docker-compose restart backend

# Or if using docker run:
docker restart acadistra_backend
```

### Issue 4: Old code still running
```bash
# Pull latest code and rebuild
cd /path/to/acadistra
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

## Testing After Deployment

1. **Test Class Listing**:
   - Go to View Marks page
   - Select Year: 2024, Term: 2
   - ✅ Classes should appear

2. **Test Attendance**:
   - Go to Attendance page
   - Select Term: 2
   - ✅ Classes should appear

3. **Test Reports**:
   - Go to Reports page
   - Select Term: 3
   - ✅ Classes should appear

4. **Test Enrollment**:
   - Check a student's enrollments
   - ✅ Should show enrollments per term for same class

## Timeline

1. **Backup**: 5 minutes
2. **Run Migration**: 1-2 minutes
3. **Verification**: 5 minutes
4. **Testing**: 10 minutes

**Total**: ~20-25 minutes

## Support

If issues persist after migration:
1. Check `docker logs acadistra_backend` for errors
2. Check browser console for frontend errors
3. Verify API returns classes: `curl https://yourdomain.com/api/classes?year=2024&term=2`
4. Check database: `SELECT * FROM classes WHERE year = 2024;`

---

**IMPORTANT**: Run this during off-peak hours if possible, as the migration will briefly lock the classes table.

**Status**: Ready to deploy ✅

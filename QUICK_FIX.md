# 🚨 QUICK FIX - Classes Not Showing for Term 2/3

## The Problem
No classes appear when you select Term 2 or Term 3 on:
- View Marks page
- Reports page  
- Attendance page

## The Cause
Migration not run on live server. Database still has `term` column.

## The Fix (Choose One)

### ⚡ FASTEST (One Command)
```bash
cd /path/to/acadistra
./deploy_yearly_classes.sh
```

### 🔧 MANUAL (3 Commands)
```bash
# 1. Backup
docker exec acadistra_db pg_dump -U postgres school_system_db > backup.sql

# 2. Migrate
docker exec acadistra_backend ./main migrate

# 3. Restart
docker restart acadistra_backend
```

### 📝 DIRECT SQL
```sql
-- Backup first, then run:
DROP INDEX IF EXISTS idx_class_school_year_term;
ALTER TABLE classes DROP COLUMN IF EXISTS term;
CREATE UNIQUE INDEX idx_class_unique ON classes(school_id, level, stream, year);
CREATE INDEX idx_class_school_year ON classes(school_id, year);
```

## Verify It Worked
```bash
# Check schema (should NOT have 'term' column)
docker exec acadistra_db psql -U postgres -d school_system_db -c "\d classes"

# Test UI: Open View Marks → Select Term 2 → Should show classes ✅
```

## Rollback If Needed
```bash
docker exec -i acadistra_db psql -U postgres -d school_system_db < backup.sql
docker restart acadistra_backend
```

## ⏱️ Time Required
- Backup: 2 min
- Migration: 1 min  
- Verify: 2 min
- **Total: ~5 minutes**

## ✅ After Fix
- Term 1: Shows classes ✓
- Term 2: Shows classes ✓
- Term 3: Shows classes ✓

**Same classes appear for all terms** (they're yearly now).

---

💡 **Tip**: Run during low-traffic time if possible.
📖 **Docs**: See `LIVE_SERVER_FIX.md` for details.

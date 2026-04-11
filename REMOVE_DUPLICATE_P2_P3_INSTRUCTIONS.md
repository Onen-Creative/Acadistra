# Fix Duplicate P2 and P3 Subjects on Live Server

## Problem
P2 and P3 have duplicate subjects because the seeding code had a bug that added subjects twice:
1. First from the `p13Subjects` array (which already had P1, P2, P3)
2. Then again from the replication loop

**Result:** Each subject appears twice for P2 and P3 levels.

## Solution
1. Remove duplicates from the database (keep oldest record)
2. Deploy fixed backend code (already fixed in codebase)

---

## Step 1: Remove Duplicates from Database

### Option A: Using psql (Recommended)

```bash
# SSH into server
ssh user@your-server-ip

# Upload the SQL file
scp backend/remove_duplicate_p2_p3_subjects.sql user@your-server-ip:/tmp/

# Run the script
psql $DATABASE_URL -f /tmp/remove_duplicate_p2_p3_subjects.sql
```

Or if using Docker:
```bash
docker exec -i acadistra_postgres psql -U postgres -d acadistra < /tmp/remove_duplicate_p2_p3_subjects.sql
```

### Option B: Manual SQL

```bash
# SSH and connect to database
ssh user@your-server-ip
psql $DATABASE_URL
```

Then run:
```sql
BEGIN;

-- Delete duplicates, keeping only the oldest record
DELETE FROM standard_subjects
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY level, name, code 
                   ORDER BY created_at ASC
               ) AS rn
        FROM standard_subjects
        WHERE level IN ('P2', 'P3')
    ) t
    WHERE t.rn > 1
);

COMMIT;

-- Verify - should show 7 subjects each for P2 and P3
SELECT level, COUNT(*) as subject_count
FROM standard_subjects 
WHERE level IN ('P2', 'P3')
GROUP BY level
ORDER BY level;
```

---

## Step 2: Verify the Fix

After running the script, verify:

```sql
-- Should return 14 rows (7 subjects × 2 levels)
SELECT level, name, code 
FROM standard_subjects 
WHERE level IN ('P2', 'P3')
ORDER BY level, name;

-- Should show: P2: 7, P3: 7
SELECT level, COUNT(*) as subject_count
FROM standard_subjects 
WHERE level IN ('P2', 'P3')
GROUP BY level;
```

**Expected subjects for P2 and P3:**
1. Creative Arts (CA)
2. Environment (ENV)
3. Life Skills (LS)
4. Literacy One (LIT1)
5. Literacy Two (LIT2)
6. Mathematics (MATH)
7. Religious Education (RE)

---

## Step 3: Deploy Fixed Backend (Optional)

The backend code has been fixed to prevent this issue in future seeding. Deploy the updated backend:

```bash
cd backend
go build ./cmd/api/main.go
# Restart your backend service
systemctl restart acadistra_backend  # or your service name
```

**What was fixed:**
- Removed the replication loop for P1-P3 subjects
- Now just appends the `p13Subjects` array directly (which already has all 21 subjects)

---

## Before and After

### Before (Duplicates):
```
P2: 14 subjects (7 duplicated)
P3: 14 subjects (7 duplicated)
```

### After (Fixed):
```
P2: 7 subjects ✅
P3: 7 subjects ✅
```

---

## Safety Notes

✅ **Safe:** Uses transaction (BEGIN/COMMIT) - rolls back on error
✅ **Keeps oldest:** Preserves the first created record, deletes newer duplicates
✅ **No data loss:** Only removes duplicate subject definitions, not student marks

⚠️ **Important:** If students have marks linked to the duplicate subjects, those marks will remain but may need to be re-linked. However, since the subjects are identical (same name, code, level), this shouldn't cause issues.

---

## Troubleshooting

**If you see no duplicates:**
```sql
-- Check if duplicates exist
SELECT level, name, code, COUNT(*) as count
FROM standard_subjects 
WHERE level IN ('P2', 'P3')
GROUP BY level, name, code
HAVING COUNT(*) > 1;
```

If this returns 0 rows, duplicates have already been removed.

**If you want to see what will be deleted before running:**
```sql
-- Preview what will be deleted (don't run the DELETE yet)
SELECT id, level, name, code, created_at
FROM (
    SELECT id, level, name, code, created_at,
           ROW_NUMBER() OVER (
               PARTITION BY level, name, code 
               ORDER BY created_at ASC
           ) AS rn
    FROM standard_subjects
    WHERE level IN ('P2', 'P3')
) t
WHERE t.rn > 1
ORDER BY level, name;
```

---

**Status:** Ready to execute
**Risk:** Low (uses transaction, keeps oldest records)
**Time:** < 30 seconds

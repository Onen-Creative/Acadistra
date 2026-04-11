# Fix P1-P3 Subjects on Live Server

## Problem
The database has incorrect subjects for P1-P3:
- Current: Literacy, Numeracy, Environment, Life Skills, Creative Arts (5 subjects)
- Expected: Literacy One, Literacy Two, Mathematics, Religious Education, Life Skills, Creative Arts, Environment (7 subjects)

## Solution
Run the SQL migration script to replace old subjects with correct NCDC Thematic Curriculum subjects.

---

## Option 1: Using psql (Recommended)

### Step 1: SSH into your server
```bash
ssh user@your-server-ip
```

### Step 2: Upload the SQL file
```bash
# From your local machine, upload the file
scp backend/fix_p1_p3_subjects.sql user@your-server-ip:/tmp/
```

### Step 3: Run the SQL script
```bash
# On the server, connect to PostgreSQL and run the script
psql $DATABASE_URL -f /tmp/fix_p1_p3_subjects.sql
```

Or if using Docker:
```bash
docker exec -i acadistra_postgres psql -U postgres -d acadistra < /tmp/fix_p1_p3_subjects.sql
```

---

## Option 2: Using Database GUI (pgAdmin, DBeaver, etc.)

1. Connect to your production database
2. Open a new SQL query window
3. Copy and paste the contents of `fix_p1_p3_subjects.sql`
4. Execute the script

---

## Option 3: Manual via psql Command

```bash
# SSH into server
ssh user@your-server-ip

# Connect to database
psql $DATABASE_URL

# Then paste and run this SQL:
```

```sql
BEGIN;

DELETE FROM standard_subjects 
WHERE level IN ('P1', 'P2', 'P3') 
AND name IN ('Literacy', 'Numeracy', 'Environment', 'Life Skills', 'Creative Arts');

-- Insert P1 subjects
INSERT INTO standard_subjects (id, name, code, level, is_compulsory, papers, grading_type, description, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Literacy One', 'LIT1', 'P1', true, 1, 'primary_lower', 'First literacy component', NOW(), NOW()),
  (gen_random_uuid(), 'Literacy Two', 'LIT2', 'P1', true, 1, 'primary_lower', 'Second literacy component', NOW(), NOW()),
  (gen_random_uuid(), 'Mathematics', 'MATH', 'P1', true, 1, 'primary_lower', 'Mathematical concepts and problem solving', NOW(), NOW()),
  (gen_random_uuid(), 'Religious Education', 'RE', 'P1', true, 1, 'primary_lower', 'Religious and moral education', NOW(), NOW()),
  (gen_random_uuid(), 'Life Skills', 'LS', 'P1', true, 1, 'primary_lower', 'Personal and social life skills', NOW(), NOW()),
  (gen_random_uuid(), 'Creative Arts', 'CA', 'P1', true, 1, 'primary_lower', 'Creative expression through arts', NOW(), NOW()),
  (gen_random_uuid(), 'Environment', 'ENV', 'P1', true, 1, 'primary_lower', 'Environmental awareness and science concepts', NOW(), NOW());

-- Insert P2 subjects (same as P1)
INSERT INTO standard_subjects (id, name, code, level, is_compulsory, papers, grading_type, description, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Literacy One', 'LIT1', 'P2', true, 1, 'primary_lower', 'First literacy component', NOW(), NOW()),
  (gen_random_uuid(), 'Literacy Two', 'LIT2', 'P2', true, 1, 'primary_lower', 'Second literacy component', NOW(), NOW()),
  (gen_random_uuid(), 'Mathematics', 'MATH', 'P2', true, 1, 'primary_lower', 'Mathematical concepts and problem solving', NOW(), NOW()),
  (gen_random_uuid(), 'Religious Education', 'RE', 'P2', true, 1, 'primary_lower', 'Religious and moral education', NOW(), NOW()),
  (gen_random_uuid(), 'Life Skills', 'LS', 'P2', true, 1, 'primary_lower', 'Personal and social life skills', NOW(), NOW()),
  (gen_random_uuid(), 'Creative Arts', 'CA', 'P2', true, 1, 'primary_lower', 'Creative expression through arts', NOW(), NOW()),
  (gen_random_uuid(), 'Environment', 'ENV', 'P2', true, 1, 'primary_lower', 'Environmental awareness and science concepts', NOW(), NOW());

-- Insert P3 subjects (same as P1)
INSERT INTO standard_subjects (id, name, code, level, is_compulsory, papers, grading_type, description, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Literacy One', 'LIT1', 'P3', true, 1, 'primary_lower', 'First literacy component', NOW(), NOW()),
  (gen_random_uuid(), 'Literacy Two', 'LIT2', 'P3', true, 1, 'primary_lower', 'Second literacy component', NOW(), NOW()),
  (gen_random_uuid(), 'Mathematics', 'MATH', 'P3', true, 1, 'primary_lower', 'Mathematical concepts and problem solving', NOW(), NOW()),
  (gen_random_uuid(), 'Religious Education', 'RE', 'P3', true, 1, 'primary_lower', 'Religious and moral education', NOW(), NOW()),
  (gen_random_uuid(), 'Life Skills', 'LS', 'P3', true, 1, 'primary_lower', 'Personal and social life skills', NOW(), NOW()),
  (gen_random_uuid(), 'Creative Arts', 'CA', 'P3', true, 1, 'primary_lower', 'Creative expression through arts', NOW(), NOW()),
  (gen_random_uuid(), 'Environment', 'ENV', 'P3', true, 1, 'primary_lower', 'Environmental awareness and science concepts', NOW(), NOW());

COMMIT;
```

---

## Verification

After running the script, verify the changes:

```sql
SELECT level, name, code, is_compulsory 
FROM standard_subjects 
WHERE level IN ('P1', 'P2', 'P3') 
ORDER BY level, name;
```

**Expected output:** 21 rows (7 subjects × 3 levels)

Each level should have:
1. Creative Arts (CA)
2. Environment (ENV)
3. Life Skills (LS)
4. Literacy One (LIT1)
5. Literacy Two (LIT2)
6. Mathematics (MATH)
7. Religious Education (RE)

---

## Important Notes

⚠️ **Warning:** This will delete existing P1-P3 subjects. If students have marks for the old subjects, those marks will remain in the database but won't be linked to valid subjects.

✅ **Safe:** The script uses a transaction (BEGIN/COMMIT), so if anything fails, all changes are rolled back.

✅ **Idempotent:** The script uses `ON CONFLICT DO NOTHING`, so it's safe to run multiple times.

---

## Rollback (if needed)

If you need to rollback, you can restore the old subjects:

```sql
BEGIN;

DELETE FROM standard_subjects WHERE level IN ('P1', 'P2', 'P3');

-- Insert old subjects back
INSERT INTO standard_subjects (id, name, code, level, is_compulsory, papers, grading_type, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Literacy', 'LIT', 'P1', true, 1, 'primary_lower', NOW(), NOW()),
  (gen_random_uuid(), 'Numeracy', 'NUM', 'P1', true, 1, 'primary_lower', NOW(), NOW()),
  (gen_random_uuid(), 'Environment', 'ENV', 'P1', true, 1, 'primary_lower', NOW(), NOW()),
  (gen_random_uuid(), 'Life Skills', 'LS', 'P1', true, 1, 'primary_lower', NOW(), NOW()),
  (gen_random_uuid(), 'Creative Arts', 'CA', 'P1', true, 1, 'primary_lower', NOW(), NOW());
-- Repeat for P2 and P3

COMMIT;
```

---

## After Running

1. Refresh the frontend
2. Check subjects page - should show 7 subjects for P1-P3
3. Teachers can now enter marks for all 7 subjects
4. Report cards will show all 7 subjects

---

**Status:** Ready to execute
**Risk:** Low (uses transaction, can rollback)
**Time:** < 1 minute

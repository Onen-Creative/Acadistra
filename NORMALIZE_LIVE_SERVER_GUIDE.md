# Quick Guide: Normalize Database on Live Server

## Option 1: Using the Bash Script (Recommended)

### Step 1: Upload the script
```bash
# The script is already in your acadistra folder
cd ~/acadistra
chmod +x normalize_db.sh
```

### Step 2: Run with better diagnostics
```bash
./normalize_db.sh --dry-run
```

If it fails, the script will now show you:
- The exact error message
- How to manually connect to test
- What credentials it's trying to use

### Step 3: Fix connection issues

**If using Docker:**
```bash
# Find your postgres container name
docker ps | grep postgres

# Test connection manually
docker exec -it <container_name> psql -U postgres -d acadistra

# If that works, the script should work too
```

**If NOT using Docker:**
```bash
# Test connection manually
psql -h localhost -p 5432 -U postgres -d acadistra

# You may need to provide password
PGPASSWORD=your_password psql -h localhost -p 5432 -U postgres -d acadistra
```

## Option 2: Direct SQL (Easiest)

### Step 1: Connect to database
```bash
# If using Docker
docker exec -it <container_name> psql -U postgres -d acadistra

# If direct connection
psql -h localhost -p 5432 -U postgres -d acadistra
```

### Step 2: Copy and paste the SQL

I've created a file `normalize_db_simple.sql` with all the SQL commands.

You can either:

**A) Run the file:**
```bash
# If using Docker
docker exec -i <container_name> psql -U postgres -d acadistra < normalize_db_simple.sql

# If direct connection
psql -h localhost -p 5432 -U postgres -d acadistra < normalize_db_simple.sql
```

**B) Copy-paste into psql:**
1. Connect to database (see Step 1)
2. Open `normalize_db_simple.sql` 
3. Copy the SQL commands
4. Paste into psql terminal
5. Press Enter

### Step 3: Verify
```sql
-- Check if any fancy text remains
SELECT COUNT(*) FROM students 
WHERE first_name ~ '[𝐀-𝟿]' OR middle_name ~ '[𝐀-𝟿]' OR last_name ~ '[𝐀-𝟿]';
-- Should return 0

-- Check backup was created
SELECT COUNT(*) FROM students_backup_normalization;
-- Should show number of students that were updated
```

## Option 3: Manual Step-by-Step

### 1. Check affected records
```sql
SELECT COUNT(*) FROM students 
WHERE first_name ~ '[𝐀-𝟿]' OR middle_name ~ '[𝐀-𝟿]' OR last_name ~ '[𝐀-𝟿]';
```

### 2. Create backup
```sql
CREATE TABLE students_backup_normalization AS 
SELECT * FROM students 
WHERE first_name ~ '[𝐀-𝟿]' OR middle_name ~ '[𝐀-𝟿]' OR last_name ~ '[𝐀-𝟿]';
```

### 3. Normalize
```sql
UPDATE students
SET 
    first_name = translate(first_name, 
        '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'),
    middle_name = translate(middle_name,
        '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'),
    last_name = translate(last_name,
        '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
WHERE 
    first_name ~ '[𝐀-𝟿]' OR
    middle_name ~ '[𝐀-𝟿]' OR
    last_name ~ '[𝐀-𝟿]';
```

### 4. Verify
```sql
SELECT COUNT(*) FROM students 
WHERE first_name ~ '[𝐀-𝟿]' OR middle_name ~ '[𝐀-𝟿]' OR last_name ~ '[𝐀-𝟿]';
-- Should return 0
```

## Troubleshooting

### "Failed to connect to database"

1. **Find your container name:**
   ```bash
   docker ps
   ```

2. **Test connection:**
   ```bash
   docker exec -it <container_name> psql -U postgres -d acadistra
   ```

3. **If that works, update the script:**
   Edit `normalize_db.sh` and change the container name on line that says `acadistra_postgres` to your actual container name.

### "Permission denied"

```bash
chmod +x normalize_db.sh
```

### "Database does not exist"

Your database might have a different name. Check with:
```bash
docker exec -it <container_name> psql -U postgres -c "\l"
```

Then use the correct database name.

## Rollback (if needed)

If something goes wrong:

```sql
UPDATE students s
SET 
    first_name = b.first_name,
    middle_name = b.middle_name,
    last_name = b.last_name
FROM students_backup_normalization b
WHERE s.id = b.id;
```

## After Success

1. Verify in the web interface that names look correct
2. Wait 24 hours to ensure everything is working
3. Clean up backup tables:
   ```sql
   DROP TABLE students_backup_normalization;
   DROP TABLE guardians_backup_normalization;
   ```

## Need Help?

Run this to get your database info:
```bash
docker ps
docker exec -it <container_name> env | grep POSTGRES
```

Send me the output (hide any passwords!) and I can help debug.

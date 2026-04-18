#!/bin/bash

# ============================================
# Database Normalization Script
# Removes Unicode mathematical symbols from student and guardian names
# ============================================

set -e

echo "🔄 Database Normalization Script"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running in dry-run mode
DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    echo -e "${BLUE}🔍 DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

# Get database connection details from environment or docker
if [ -f .env.production ]; then
    source .env.production
elif [ -f .env ]; then
    source .env
fi

# Default to docker container if no env vars
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-acadistra}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# Check if we should use docker
USE_DOCKER=false
if docker ps | grep -q acadistra_postgres; then
    USE_DOCKER=true
    echo -e "${GREEN}✓ Found PostgreSQL container${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL container not found, using direct connection${NC}"
fi

# Function to execute SQL
execute_sql() {
    local sql="$1"
    if [ "$USE_DOCKER" = true ]; then
        docker exec -i acadistra_postgres psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$sql"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "$sql"
    fi
}

# Function to execute SQL file
execute_sql_file() {
    local sql="$1"
    if [ "$USE_DOCKER" = true ]; then
        echo "$sql" | docker exec -i acadistra_postgres psql -U "$DB_USER" -d "$DB_NAME"
    else
        echo "$sql" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
    fi
}

# Check database connection
echo "Testing database connection..."
if ! execute_sql "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to connect to database${NC}"
    echo "Please check your database credentials"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Count affected records
echo "Checking for records with Unicode symbols..."
AFFECTED_STUDENTS=$(execute_sql "SELECT COUNT(*) FROM students WHERE first_name ~ '[𝐀-𝟿]' OR middle_name ~ '[𝐀-𝟿]' OR last_name ~ '[𝐀-𝟿]';")
AFFECTED_GUARDIANS=$(execute_sql "SELECT COUNT(*) FROM guardians WHERE full_name ~ '[𝐀-𝟿]';")

echo -e "${BLUE}📊 Found:${NC}"
echo "   Students with fancy text: $AFFECTED_STUDENTS"
echo "   Guardians with fancy text: $AFFECTED_GUARDIANS"
echo ""

if [ "$AFFECTED_STUDENTS" -eq 0 ] && [ "$AFFECTED_GUARDIANS" -eq 0 ]; then
    echo -e "${GREEN}✅ No records need normalization!${NC}"
    exit 0
fi

# Show sample of affected records
if [ "$AFFECTED_STUDENTS" -gt 0 ]; then
    echo -e "${YELLOW}Sample of affected students:${NC}"
    execute_sql "SELECT admission_no, first_name, middle_name, last_name FROM students WHERE first_name ~ '[𝐀-𝟿]' OR middle_name ~ '[𝐀-𝟿]' OR last_name ~ '[𝐀-𝟿]' LIMIT 5;" | while IFS='|' read -r admission first middle last; do
        echo "  $admission: $first $middle $last"
    done
    echo ""
fi

# Exit if dry-run
if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}To apply changes, run without --dry-run:${NC}"
    echo "  ./normalize_db.sh"
    exit 0
fi

# Confirm before proceeding
echo -e "${YELLOW}⚠️  WARNING: This will update $((AFFECTED_STUDENTS + AFFECTED_GUARDIANS)) records${NC}"
echo -e "${YELLOW}⚠️  A backup will be created before making changes${NC}"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}❌ Aborted${NC}"
    exit 0
fi

echo ""
echo "Creating backup..."

# Create backup tables
BACKUP_SQL="
-- Backup students
DROP TABLE IF EXISTS students_backup_normalization;
CREATE TABLE students_backup_normalization AS 
SELECT * FROM students 
WHERE first_name ~ '[𝐀-𝟿]' OR middle_name ~ '[𝐀-𝟿]' OR last_name ~ '[𝐀-𝟿]';

-- Backup guardians
DROP TABLE IF EXISTS guardians_backup_normalization;
CREATE TABLE guardians_backup_normalization AS 
SELECT * FROM guardians 
WHERE full_name ~ '[𝐀-𝟿]';
"

execute_sql_file "$BACKUP_SQL"
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

# Normalize students
echo "Normalizing student names..."
NORMALIZE_STUDENTS_SQL="
UPDATE students
SET 
    first_name = regexp_replace(
        regexp_replace(
            regexp_replace(first_name, '[𝐀-𝐙]', substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ', position(first_name in '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙'), 1), 'g'),
            '[𝐚-𝐳]', substring('abcdefghijklmnopqrstuvwxyz', position(first_name in '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳'), 1), 'g'),
        '[𝟎-𝟗]', substring('0123456789', position(first_name in '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗'), 1), 'g'),
    middle_name = regexp_replace(
        regexp_replace(
            regexp_replace(middle_name, '[𝐀-𝐙]', substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ', position(middle_name in '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙'), 1), 'g'),
            '[𝐚-𝐳]', substring('abcdefghijklmnopqrstuvwxyz', position(middle_name in '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳'), 1), 'g'),
        '[𝟎-𝟗]', substring('0123456789', position(middle_name in '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗'), 1), 'g'),
    last_name = regexp_replace(
        regexp_replace(
            regexp_replace(last_name, '[𝐀-𝐙]', substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ', position(last_name in '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙'), 1), 'g'),
            '[𝐚-𝐳]', substring('abcdefghijklmnopqrstuvwxyz', position(last_name in '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳'), 1), 'g'),
        '[𝟎-𝟗]', substring('0123456789', position(last_name in '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗'), 1), 'g'),
    updated_at = NOW()
WHERE 
    first_name ~ '[𝐀-𝟿]' OR
    middle_name ~ '[𝐀-𝟿]' OR
    last_name ~ '[𝐀-𝟿]';
"

# Simpler approach - just remove the fancy characters
SIMPLE_NORMALIZE_SQL="
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
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'),
    updated_at = NOW()
WHERE 
    first_name ~ '[𝐀-𝟿]' OR
    middle_name ~ '[𝐀-𝟿]' OR
    last_name ~ '[𝐀-𝟿]';
"

execute_sql_file "$SIMPLE_NORMALIZE_SQL"
echo -e "${GREEN}✓ Students normalized${NC}"

# Normalize guardians
echo "Normalizing guardian names..."
NORMALIZE_GUARDIANS_SQL="
UPDATE guardians
SET 
    full_name = translate(full_name,
        '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'),
    updated_at = NOW()
WHERE 
    full_name ~ '[𝐀-𝟿]';
"

execute_sql_file "$NORMALIZE_GUARDIANS_SQL"
echo -e "${GREEN}✓ Guardians normalized${NC}"
echo ""

# Verify
echo "Verifying results..."
REMAINING_STUDENTS=$(execute_sql "SELECT COUNT(*) FROM students WHERE first_name ~ '[𝐀-𝟿]' OR middle_name ~ '[𝐀-𝟿]' OR last_name ~ '[𝐀-𝟿]';")
REMAINING_GUARDIANS=$(execute_sql "SELECT COUNT(*) FROM guardians WHERE full_name ~ '[𝐀-𝟿]';")

echo -e "${BLUE}📊 Results:${NC}"
echo "   Students updated: $AFFECTED_STUDENTS"
echo "   Guardians updated: $AFFECTED_GUARDIANS"
echo "   Remaining issues: $((REMAINING_STUDENTS + REMAINING_GUARDIANS))"
echo ""

if [ "$REMAINING_STUDENTS" -eq 0 ] && [ "$REMAINING_GUARDIANS" -eq 0 ]; then
    echo -e "${GREEN}✅ All records normalized successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Some records still have Unicode symbols${NC}"
    echo "   This may be due to different Unicode ranges"
    echo "   Check the backup tables for details"
fi

echo ""
echo -e "${BLUE}Backup tables created:${NC}"
echo "   - students_backup_normalization"
echo "   - guardians_backup_normalization"
echo ""
echo -e "${YELLOW}To rollback changes:${NC}"
echo "   UPDATE students s SET first_name = b.first_name, middle_name = b.middle_name, last_name = b.last_name"
echo "   FROM students_backup_normalization b WHERE s.id = b.id;"
echo ""
echo -e "${GREEN}✅ Normalization complete!${NC}"

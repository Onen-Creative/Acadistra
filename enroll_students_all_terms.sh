#!/bin/bash
# Enroll all Term 1 students for Terms 2 and 3
# Usage: ./enroll_students_all_terms.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Enroll Students for All Terms${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

DB_CONTAINER="${DB_CONTAINER:-acadistra_db}"
DB_NAME="${DB_NAME:-school_system_db}"
DB_USER="${DB_USER:-postgres}"

# Check current enrollment status
echo -e "${YELLOW}Current enrollment status:${NC}"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT term, COUNT(DISTINCT student_id) as students, COUNT(*) as enrollments 
   FROM enrollments 
   WHERE year = 2024 AND status = 'active' 
   GROUP BY term ORDER BY term;"
echo ""

# Confirm
read -p "Enroll all Term 1 students for Terms 2 and 3? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Aborted."
    exit 0
fi

echo -e "${YELLOW}Creating Term 2 enrollments...${NC}"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<EOF
INSERT INTO enrollments (id, student_id, class_id, year, term, status, enrolled_on, created_at, updated_at)
SELECT gen_random_uuid(), student_id, class_id, year, '2', status, enrolled_on, NOW(), NOW()
FROM enrollments
WHERE year = 2024 AND term = '1' AND status = 'active'
ON CONFLICT (student_id, class_id, year, term) DO NOTHING;
EOF

TERM2_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM enrollments WHERE year = 2024 AND term = '2' AND status = 'active';")
echo -e "${GREEN}✓ Term 2: $TERM2_COUNT enrollments created${NC}"
echo ""

echo -e "${YELLOW}Creating Term 3 enrollments...${NC}"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<EOF
INSERT INTO enrollments (id, student_id, class_id, year, term, status, enrolled_on, created_at, updated_at)
SELECT gen_random_uuid(), student_id, class_id, year, '3', status, enrolled_on, NOW(), NOW()
FROM enrollments
WHERE year = 2024 AND term = '1' AND status = 'active'
ON CONFLICT (student_id, class_id, year, term) DO NOTHING;
EOF

TERM3_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT COUNT(*) FROM enrollments WHERE year = 2024 AND term = '3' AND status = 'active';")
echo -e "${GREEN}✓ Term 3: $TERM3_COUNT enrollments created${NC}"
echo ""

# Show final status
echo -e "${GREEN}Final enrollment status:${NC}"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT term, COUNT(DISTINCT student_id) as students, COUNT(*) as enrollments 
   FROM enrollments 
   WHERE year = 2024 AND status = 'active' 
   GROUP BY term ORDER BY term;"
echo ""

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✓ Complete!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Students are now enrolled for all 3 terms."
echo "Test by viewing marks/attendance for Term 2 - students should appear."
echo ""

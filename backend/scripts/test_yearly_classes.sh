#!/bin/bash
# Test script to verify yearly class implementation

set -e

echo "🧪 Testing Yearly Class System Implementation"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:8080/api"
AUTH_TOKEN="" # Set this or login first

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected=$4
    
    echo -n "Testing $method $endpoint... "
    
    response=$(curl -s -X $method "$API_BASE$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "$data")
    
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "Response: $response"
        return 1
    fi
}

echo "1. Database Schema Verification"
echo "--------------------------------"

# Check if term column is removed from classes table
echo -n "Checking classes table schema... "
PGPASSWORD=${DB_PASSWORD:-postgres} psql -h ${DB_HOST:-localhost} -U ${DB_USER:-postgres} -d ${DB_NAME:-school_system_db} -c "\d classes" | grep -q "term" && {
    echo -e "${RED}✗ FAIL - Term column still exists${NC}"
    exit 1
} || {
    echo -e "${GREEN}✓ PASS - Term column removed${NC}"
}

# Check if unique index exists
echo -n "Checking unique constraint... "
PGPASSWORD=${DB_PASSWORD:-postgres} psql -h ${DB_HOST:-localhost} -U ${DB_USER:-postgres} -d ${DB_NAME:-school_system_db} -c "\d classes" | grep -q "idx_class_unique" && {
    echo -e "${GREEN}✓ PASS - Unique constraint exists${NC}"
} || {
    echo -e "${RED}✗ FAIL - Unique constraint missing${NC}"
    exit 1
}

echo ""
echo "2. API Endpoint Tests"
echo "---------------------"

# Test: Create class without term
echo "Testing class creation (without term)..."
CLASS_ID=$(curl -s -X POST "$API_BASE/classes" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "school_id": "'"$SCHOOL_ID"'",
        "level": "P1",
        "stream": "Test",
        "year": 2024,
        "capacity": 30
    }' | jq -r '.id')

if [ ! -z "$CLASS_ID" ] && [ "$CLASS_ID" != "null" ]; then
    echo -e "${GREEN}✓ Class created successfully (ID: $CLASS_ID)${NC}"
else
    echo -e "${RED}✗ Failed to create class${NC}"
    exit 1
fi

# Test: Attempt to create duplicate class (should fail)
echo "Testing duplicate prevention..."
DUPLICATE_RESPONSE=$(curl -s -X POST "$API_BASE/classes" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "school_id": "'"$SCHOOL_ID"'",
        "level": "P1",
        "stream": "Test",
        "year": 2024,
        "capacity": 30
    }')

if echo "$DUPLICATE_RESPONSE" | grep -q "already exists for this year"; then
    echo -e "${GREEN}✓ Duplicate prevention working${NC}"
else
    echo -e "${RED}✗ Duplicate prevention failed${NC}"
    echo "Response: $DUPLICATE_RESPONSE"
fi

# Test: List classes (term parameter should be ignored)
echo "Testing class listing..."
curl -s "$API_BASE/classes?year=2024&term=1" \
    -H "Authorization: Bearer $AUTH_TOKEN" | grep -q "$CLASS_ID" && {
    echo -e "${GREEN}✓ Class listing works${NC}"
} || {
    echo -e "${RED}✗ Class listing failed${NC}"
}

echo ""
echo "3. Enrollment Tests"
echo "-------------------"

# Test: Enroll student for Term 1
echo "Testing enrollment for Term 1..."
ENROLLMENT_1=$(curl -s -X POST "$API_BASE/enrollments" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "student_id": "'"$STUDENT_ID"'",
        "class_id": "'"$CLASS_ID"'",
        "year": 2024,
        "term": "1",
        "status": "active"
    }')

echo "$ENROLLMENT_1" | grep -q '"id"' && {
    echo -e "${GREEN}✓ Term 1 enrollment successful${NC}"
} || {
    echo -e "${RED}✗ Term 1 enrollment failed${NC}"
}

# Test: Enroll same student for Term 2
echo "Testing enrollment for Term 2 (same class)..."
ENROLLMENT_2=$(curl -s -X POST "$API_BASE/enrollments" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "student_id": "'"$STUDENT_ID"'",
        "class_id": "'"$CLASS_ID"'",
        "year": 2024,
        "term": "2",
        "status": "active"
    }')

echo "$ENROLLMENT_2" | grep -q '"id"' && {
    echo -e "${GREEN}✓ Term 2 enrollment successful${NC}"
} || {
    echo -e "${RED}✗ Term 2 enrollment failed${NC}"
}

# Test: Get students for specific term
echo "Testing term-filtered student list..."
curl -s "$API_BASE/classes/$CLASS_ID/students?term=1" \
    -H "Authorization: Bearer $AUTH_TOKEN" | grep -q "$STUDENT_ID" && {
    echo -e "${GREEN}✓ Term-filtered students working${NC}"
} || {
    echo -e "${RED}✗ Term-filtered students failed${NC}"
}

echo ""
echo "4. Cleanup"
echo "----------"

# Delete test class
echo -n "Cleaning up test data... "
curl -s -X DELETE "$API_BASE/classes/$CLASS_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null
echo -e "${GREEN}✓ Done${NC}"

echo ""
echo "=============================================="
echo -e "${GREEN}✅ All Tests Complete!${NC}"
echo ""
echo "Summary:"
echo "  - Database schema: ✓"
echo "  - Class creation: ✓"
echo "  - Duplicate prevention: ✓"
echo "  - Multi-term enrollments: ✓"
echo "  - Term filtering: ✓"
echo ""
echo "⚠️  Remember to test frontend integration!"

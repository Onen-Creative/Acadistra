#!/bin/bash
# Diagnostic script to test class listing with term parameter

set -e

echo "🔍 Testing Class Listing with Term Parameter"
echo "============================================="
echo ""

API_BASE="${API_BASE:-http://localhost:8080/api}"
TOKEN="${TOKEN:-}"

if [ -z "$TOKEN" ]; then
    echo "⚠️  No TOKEN set. Usage:"
    echo "   export TOKEN='your-jwt-token'"
    echo "   ./test_class_term_filter.sh"
    echo ""
    echo "Or provide API_BASE:"
    echo "   export API_BASE='https://yourserver.com/api'"
    exit 1
fi

echo "Using API: $API_BASE"
echo ""

# Test 1: List classes without term
echo "Test 1: List all classes (no term parameter)"
echo "---------------------------------------------"
RESPONSE1=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/classes?year=2024")
CLASS_COUNT1=$(echo "$RESPONSE1" | jq '. | length' 2>/dev/null || echo "0")
echo "Result: Found $CLASS_COUNT1 classes"
echo "$RESPONSE1" | jq -r '.[] | "\(.name) (Year: \(.year))"' 2>/dev/null || echo "$RESPONSE1"
echo ""

# Test 2: List classes with term=1
echo "Test 2: List classes for Term 1"
echo "--------------------------------"
RESPONSE2=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/classes?year=2024&term=1")
CLASS_COUNT2=$(echo "$RESPONSE2" | jq '. | length' 2>/dev/null || echo "0")
echo "Result: Found $CLASS_COUNT2 classes"
echo "$RESPONSE2" | jq -r '.[] | "\(.name) (Year: \(.year))"' 2>/dev/null || echo "$RESPONSE2"
echo ""

# Test 3: List classes with term=2
echo "Test 3: List classes for Term 2"
echo "--------------------------------"
RESPONSE3=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/classes?year=2024&term=2")
CLASS_COUNT3=$(echo "$RESPONSE3" | jq '. | length' 2>/dev/null || echo "0")
echo "Result: Found $CLASS_COUNT3 classes"
echo "$RESPONSE3" | jq -r '.[] | "\(.name) (Year: \(.year))"' 2>/dev/null || echo "$RESPONSE3"
echo ""

# Test 4: List classes with term=3
echo "Test 4: List classes for Term 3"
echo "--------------------------------"
RESPONSE4=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/classes?year=2024&term=3")
CLASS_COUNT4=$(echo "$RESPONSE4" | jq '. | length' 2>/dev/null || echo "0")
echo "Result: Found $CLASS_COUNT4 classes"
echo "$RESPONSE4" | jq -r '.[] | "\(.name) (Year: \(.year))"' 2>/dev/null || echo "$RESPONSE4"
echo ""

# Analysis
echo "============================================="
echo "📊 Analysis"
echo "============================================="
echo ""

if [ "$CLASS_COUNT2" = "0" ]; then
    echo "❌ PROBLEM FOUND: No classes returned for Term 2"
    echo ""
    echo "Possible causes:"
    echo "1. Migration not run - classes table still has 'term' column"
    echo "2. Old code still deployed - using old repository/service"
    echo "3. No classes exist for year 2024"
    echo ""
    echo "Solutions:"
    echo "1. Run migration: docker exec acadistra_backend ./main migrate"
    echo "2. Redeploy with latest code"
    echo "3. Check database: SELECT * FROM classes WHERE year = 2024;"
elif [ "$CLASS_COUNT1" = "$CLASS_COUNT2" ] && [ "$CLASS_COUNT2" = "$CLASS_COUNT3" ]; then
    echo "✅ WORKING CORRECTLY: Same classes returned regardless of term"
    echo ""
    echo "Classes are yearly (no term field)."
    echo "All terms show the same classes: $CLASS_COUNT1 classes found."
    echo ""
    echo "If frontend still not showing classes for Term 2:"
    echo "1. Check browser console for JavaScript errors"
    echo "2. Check if frontend is filtering classes by term field"
    echo "3. Verify frontend is using correct API endpoint"
else
    echo "⚠️  UNEXPECTED: Different class counts per term"
    echo ""
    echo "No term: $CLASS_COUNT1"
    echo "Term 1:  $CLASS_COUNT2"
    echo "Term 2:  $CLASS_COUNT3"
    echo "Term 3:  $CLASS_COUNT4"
    echo ""
    echo "This suggests migration may be incomplete or data inconsistency."
fi

echo ""
echo "============================================="
echo "🔧 Manual Checks"
echo "============================================="
echo ""
echo "Check database schema:"
echo "  psql -c \"\\d classes\""
echo "  (Should NOT have 'term' column)"
echo ""
echo "Check class records:"
echo "  psql -c \"SELECT id, name, level, year FROM classes WHERE year = 2024;\""
echo ""
echo "Check enrollments:"
echo "  psql -c \"SELECT class_id, term, COUNT(*) FROM enrollments GROUP BY class_id, term;\""
echo ""

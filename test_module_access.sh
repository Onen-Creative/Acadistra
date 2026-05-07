#!/bin/bash

# Test Module Access Control
# This script tests that module access control is properly enforced

echo "=== Module Access Control Test ==="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:8080/api/v1}"
TOKEN="${TOKEN:-}"

if [ -z "$TOKEN" ]; then
    echo "Error: TOKEN environment variable not set"
    echo "Usage: TOKEN=your_jwt_token ./test_module_access.sh"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local module=$3
    local should_work=$4
    
    echo -n "Testing $method $endpoint (module: $module)... "
    
    response=$(curl -s -w "\n%{http_code}" -X $method \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        "$API_URL$endpoint")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$should_work" = "true" ]; then
        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
            echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        else
            echo -e "${RED}✗ FAIL${NC} (Expected 200/201, got HTTP $http_code)"
            echo "Response: $body"
        fi
    else
        if [ "$http_code" = "403" ]; then
            echo -e "${GREEN}✓ PASS${NC} (Correctly blocked with HTTP $http_code)"
        else
            echo -e "${RED}✗ FAIL${NC} (Expected 403, got HTTP $http_code)"
            echo "Response: $body"
        fi
    fi
}

echo "Note: This test assumes the school has ONLY the 'academic' module active"
echo ""

# Academic module endpoints (should work)
echo -e "${YELLOW}Academic Module Endpoints (should work):${NC}"
test_endpoint "GET" "/students" "academic" "true"
test_endpoint "GET" "/classes" "academic" "true"
test_endpoint "GET" "/attendance" "academic" "true"
test_endpoint "GET" "/results/bulk-marks" "academic" "true"
echo ""

# HR module endpoints (should fail)
echo -e "${YELLOW}HR Module Endpoints (should be blocked):${NC}"
test_endpoint "GET" "/staff" "hr" "false"
test_endpoint "GET" "/payroll/salary-structures" "hr" "false"
echo ""

# Finance module endpoints (should fail)
echo -e "${YELLOW}Finance Module Endpoints (should be blocked):${NC}"
test_endpoint "GET" "/fees" "finance" "false"
test_endpoint "GET" "/finance/income" "finance" "false"
test_endpoint "GET" "/budgets" "finance" "false"
test_endpoint "GET" "/requisitions" "finance" "false"
echo ""

# Library module endpoints (should fail)
echo -e "${YELLOW}Library Module Endpoints (should be blocked):${NC}"
test_endpoint "GET" "/library/books" "library" "false"
test_endpoint "GET" "/library/issues" "library" "false"
echo ""

# Clinic module endpoints (should fail)
echo -e "${YELLOW}Clinic Module Endpoints (should be blocked):${NC}"
test_endpoint "GET" "/clinic/visits" "clinic" "false"
test_endpoint "GET" "/clinic/medicines" "clinic" "false"
echo ""

# Inventory module endpoints (should fail)
echo -e "${YELLOW}Inventory Module Endpoints (should be blocked):${NC}"
test_endpoint "GET" "/inventory/items" "inventory" "false"
echo ""

# SMS module endpoints (should fail)
echo -e "${YELLOW}SMS Module Endpoints (should be blocked):${NC}"
test_endpoint "GET" "/sms/logs" "sms" "false"
test_endpoint "GET" "/sms/templates" "sms" "false"
echo ""

# Parent portal module endpoints (should fail for non-parent users)
echo -e "${YELLOW}Parent Portal Module Endpoints (should be blocked):${NC}"
test_endpoint "GET" "/parent/dashboard" "parent_portal" "false"
echo ""

echo "=== Test Complete ==="

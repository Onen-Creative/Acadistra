#!/bin/bash

# Test the /api/v1/modules endpoint
# First login to get a token

echo "Testing /api/v1/modules endpoint..."
echo ""

# Login
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sysadmin@acadistra.com","password":"Admin@123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Test modules endpoint
echo "2. Testing GET /api/v1/modules..."
MODULES_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  http://localhost:8080/api/v1/modules \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$MODULES_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$MODULES_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "✅ Endpoint works correctly!"
else
  echo ""
  echo "❌ Endpoint returned $HTTP_CODE"
fi

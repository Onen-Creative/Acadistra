#!/bin/bash

# Simple Grade Recalculation Script
# Make sure backend is running first!

echo "🔧 Recalculating UACE Grades..."
echo ""

# Login
echo "🔐 Logging in..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sysadmin@school.ug","password":"Admin@123"}' \
  | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Login failed. Make sure:"
    echo "   1. Backend is running (cd backend && go run cmd/api/main.go)"
    echo "   2. Credentials are correct"
    exit 1
fi

echo "✅ Logged in"
echo ""

# Recalculate S5
echo "📊 Recalculating S5 grades..."
curl -s -X POST "http://localhost:8080/api/v1/results/recalculate?level=S5" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""

# Recalculate S6
echo "📊 Recalculating S6 grades..."
curl -s -X POST "http://localhost:8080/api/v1/results/recalculate?level=S6" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "✅ Done! Check Results Management page to verify."

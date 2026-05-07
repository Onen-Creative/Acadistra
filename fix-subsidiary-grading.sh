#!/bin/bash

# Fix Subsidiary Grading Bug
# This script recalculates all S5/S6 grades with the corrected subsidiary logic

set -e

echo "🔧 Fixing Subsidiary Grading Logic..."
echo ""

# Check if backend is running
if ! pgrep -f "go run cmd/api/main.go" > /dev/null; then
    echo "❌ Backend is not running. Please start it first:"
    echo "   cd backend && go run cmd/api/main.go"
    exit 1
fi

# Get school ID and credentials
read -p "Enter School ID (or press Enter for default): " SCHOOL_ID
SCHOOL_ID=${SCHOOL_ID:-"your-school-id-here"}

read -p "Enter Admin Email [admin@acadistra.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@acadistra.com"}

read -sp "Enter Admin Password [Admin@123]: " ADMIN_PASSWORD
ADMIN_PASSWORD=${ADMIN_PASSWORD:-"Admin@123"}
echo ""

# Login to get token
echo "🔐 Logging in..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Login failed. Check credentials."
    exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Recalculate grades for S5 and S6
echo "📊 Recalculating S5 grades..."
curl -s -X POST "http://localhost:8080/api/v1/results/recalculate?level=S5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

echo ""
echo "📊 Recalculating S6 grades..."
curl -s -X POST "http://localhost:8080/api/v1/results/recalculate?level=S6" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

echo ""
echo "✅ Grade recalculation complete!"
echo ""
echo "📋 Summary of fixes:"
echo "   • Subsidiary Pass (O): Code ≤6 (marks 60-100) ✓"
echo "   • Subsidiary Fail (F): Code ≥7 (marks 0-59) ✓"
echo ""
echo "🔍 Please verify the results in the Results Management page."

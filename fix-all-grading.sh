#!/bin/bash

# Fix All UACE Grading Issues
# This script recalculates all S5/S6 grades with corrected logic

set -e

echo "🔧 Fixing UACE Grading Issues..."
echo ""
echo "Fixes applied:"
echo "  ✅ Subsidiary: 50-100% = O (Pass), 0-49% = F (Fail)"
echo "  ✅ Principal: Proper paper aggregation with exam_type filter"
echo ""

# Check if backend is running
if ! pgrep -f "go run cmd/api/main.go" > /dev/null && ! pgrep -f "./main" > /dev/null; then
    echo "❌ Backend is not running. Please start it first:"
    echo "   cd backend && go run cmd/api/main.go"
    exit 1
fi

# Get credentials
read -p "Enter Admin Email [admin@acadistra.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@acadistra.com"}

read -sp "Enter Admin Password [Admin@123]: " ADMIN_PASSWORD
ADMIN_PASSWORD=${ADMIN_PASSWORD:-"Admin@123"}
echo ""
echo ""

# Login to get token
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Login failed. Check credentials."
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Recalculate grades for all levels
echo "📊 Recalculating S5 grades..."
S5_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/results/recalculate?level=S5" \
  -H "Authorization: Bearer $TOKEN")
echo $S5_RESPONSE | jq '.'

echo ""
echo "📊 Recalculating S6 grades..."
S6_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/results/recalculate?level=S6" \
  -H "Authorization: Bearer $TOKEN")
echo $S6_RESPONSE | jq '.'

echo ""
echo "✅ Grade recalculation complete!"
echo ""
echo "📋 Summary of fixes:"
echo "   • Subsidiary Pass (O): 50-100% (Code 1-7) ✓"
echo "   • Subsidiary Fail (F): 0-49% (Code 8-9) ✓"
echo "   • Principal subjects: Proper paper aggregation ✓"
echo ""
echo "🔍 Please verify the results in the Results Management page."
echo ""
echo "Expected results for your data:"
echo "   • James - Biology (66,99): Should be E"
echo "   • James - Chemistry (66,99): Should be E"
echo "   • Mwaka - Chemistry (88,77): Should be B"
echo "   • Onen - Biology (99,66): Should be E"
echo "   • Onen - Chemistry (99,66): Should be E"
echo "   • Sub Math (50): Should be O"
echo "   • Sub Math (78): Should be O"

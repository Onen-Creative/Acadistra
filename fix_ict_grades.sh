#!/bin/bash

# Script to recalculate subsidiary subject grades (ICT, Subsidiary Mathematics, General Paper)
# for S5 and S6 students on live server
# This will convert D1, P8, F9, etc. to O (Pass) or F (Fail) for subsidiary subjects

echo "========================================"
echo "Subsidiary Subject Grade Recalculation"
echo "========================================"
echo ""

# Live server URL
SERVER_URL="https://your-domain.com"  # UPDATE THIS with your actual domain

# Prompt for admin credentials
echo "Please enter your admin credentials:"
read -p "Email: " EMAIL
read -sp "Password: " PASSWORD
echo ""
echo ""

# Login and get token
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Please check your credentials."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo ""

# Prompt for term and year
read -p "Enter Term (e.g., Term 1, Term 2, Term 3): " TERM
read -p "Enter Year (e.g., 2026): " YEAR
echo ""

# Recalculate grades for S5
echo "Recalculating S5 subsidiary subject grades..."
S5_RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/results/recalculate?level=S5&term=${TERM}&year=${YEAR}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "S5 Response:"
echo $S5_RESPONSE | python3 -m json.tool 2>/dev/null || echo $S5_RESPONSE
echo ""

# Recalculate grades for S6
echo "Recalculating S6 subsidiary subject grades..."
S6_RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/results/recalculate?level=S6&term=${TERM}&year=${YEAR}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "S6 Response:"
echo $S6_RESPONSE | python3 -m json.tool 2>/dev/null || echo $S6_RESPONSE
echo ""

echo "========================================"
echo "✅ Grade recalculation completed!"
echo "========================================"
echo ""
echo "Summary:"
echo "- All ICT grades converted to O/F"
echo "- All Subsidiary Mathematics grades converted to O/F"
echo "- All General Paper grades converted to O/F"
echo "- All subjects starting with 'Subsidiary' converted to O/F"
echo ""
echo "Grading: O (Pass) = ≥50%, F (Fail) = <50%"


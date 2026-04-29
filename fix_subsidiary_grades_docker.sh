#!/bin/bash

# Script to recalculate subsidiary subject grades directly on the server
# Run this script on your production server where Docker containers are running

echo "========================================"
echo "Subsidiary Grade Recalculation (Docker)"
echo "========================================"
echo ""

# Check if running on server with Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please run this script on your production server."
    exit 1
fi

# Check if backend container is running
if ! docker ps | grep -q acadistra_backend; then
    echo "❌ Backend container (acadistra_backend) is not running."
    echo "Please start the containers first: docker compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo "✅ Backend container found and running"
echo ""

# Prompt for details
read -p "Enter Term (e.g., Term 1, Term 2, Term 3): " TERM
read -p "Enter Year (e.g., 2026): " YEAR
read -p "Enter admin email [admin@acadistra.com]: " EMAIL
EMAIL=${EMAIL:-admin@acadistra.com}
read -sp "Enter admin password: " PASSWORD
echo ""
echo ""

# Login and get token
echo "Logging in as ${EMAIL}..."
LOGIN_RESPONSE=$(docker exec acadistra_backend curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Please check your credentials."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo ""

# URL encode the term (replace spaces with %20)
TERM_ENCODED=$(echo "$TERM" | sed 's/ /%20/g')

# Recalculate S5 grades
echo "Recalculating S5 subsidiary subject grades..."
S5_RESPONSE=$(docker exec acadistra_backend curl -s -X POST \
  "http://localhost:8080/api/results/recalculate?level=S5&term=${TERM_ENCODED}&year=${YEAR}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "S5 Response:"
echo $S5_RESPONSE | python3 -m json.tool 2>/dev/null || echo $S5_RESPONSE
echo ""

# Recalculate S6 grades
echo "Recalculating S6 subsidiary subject grades..."
S6_RESPONSE=$(docker exec acadistra_backend curl -s -X POST \
  "http://localhost:8080/api/results/recalculate?level=S6&term=${TERM_ENCODED}&year=${YEAR}" \
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
echo ""
echo "Note: Check the 'updated' count in the responses above."
echo "If updated=0, the grades may already be correct or no subsidiary subjects found."


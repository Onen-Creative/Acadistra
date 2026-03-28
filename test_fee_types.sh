#!/bin/bash

echo "Testing Standard Fee Types API..."

# Test the public setup endpoint first
echo "1. Testing public setup endpoint:"
curl -s http://localhost:8080/setup/seed-fee-types

echo -e "\n\n2. Testing fee types API (should require auth):"
curl -s http://localhost:8080/api/v1/fee-types

echo -e "\n\n3. Testing database directly:"
cd /home/od/workspace/programming/school\ management\ system/backend
PGPASSWORD=postgres psql -h localhost -U postgres -d school_system_db -c "SELECT name, code, category, is_compulsory FROM standard_fee_types ORDER BY category, name;"

echo -e "\n\nTest completed!"
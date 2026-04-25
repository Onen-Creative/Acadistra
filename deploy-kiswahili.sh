#!/bin/bash
# Deploy Kiswahili subject to live server
# Safe to run - only adds new records, doesn't modify existing data
# Correct container names: acadistra_postgres, database: acadistra, user: acadistra

set -e

echo "🚀 Adding Kiswahili to Advanced Level (S5-S6)..."

# Execute migration directly in PostgreSQL container
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "
-- Add Kiswahili for S5 (2 papers)
INSERT INTO standard_subjects (id, name, code, level, is_compulsory, papers, created_at, updated_at)
SELECT gen_random_uuid(), 'Kiswahili', 'KIS', 'S5', false, 2, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM standard_subjects 
    WHERE code = 'KIS' AND level = 'S5'
);

-- Add Kiswahili for S6 (2 papers)
INSERT INTO standard_subjects (id, name, code, level, is_compulsory, papers, created_at, updated_at)
SELECT gen_random_uuid(), 'Kiswahili', 'KIS', 'S6', false, 2, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM standard_subjects 
    WHERE code = 'KIS' AND level = 'S6'
);
"

echo "✅ Kiswahili added successfully!"
echo ""
echo "Verification:"
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT name, code, level, papers FROM standard_subjects WHERE code = 'KIS' AND level IN ('S5', 'S6');"

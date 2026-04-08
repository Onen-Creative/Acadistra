#!/bin/bash

# Script to create staff records for existing school admins

echo "=========================================="
echo "Create Staff Records for School Admins"
echo "=========================================="
echo ""

cd "$(dirname "$0")/.."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

echo "Running migration..."
echo ""

go run scripts/create_staff_for_admins.go

echo ""
echo "Migration completed!"

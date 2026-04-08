#!/bin/bash

# Script to create staff records for existing school admins on live server
# Run this on your VPS server

echo "=========================================="
echo "Create Staff Records for School Admins"
echo "=========================================="
echo ""

# Check if running inside Docker container
if [ -f /.dockerenv ]; then
    echo "Running inside Docker container..."
    psql -U acadistra -d acadistra -f /app/scripts/create_staff_for_admins.sql
else
    echo "Running on host system..."
    
    # Load environment variables from .env.production
    if [ -f .env.production ]; then
        export $(cat .env.production | grep -v '^#' | grep -v '^$' | xargs)
    fi
    
    # Run via docker exec (recommended for production)
    if command -v docker &> /dev/null; then
        echo "Executing via Docker container..."
        docker cp scripts/create_staff_for_admins.sql acadistra_backend:/tmp/ && \
        docker exec -i acadistra_backend psql -h postgres -U acadistra -d acadistra -f /tmp/create_staff_for_admins.sql
    else
        echo "Docker not found. Please run this script on the VPS with Docker installed."
        exit 1
    fi
fi

echo ""
echo "Migration completed!"

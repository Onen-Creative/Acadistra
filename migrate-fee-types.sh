#!/bin/bash

# Auto Migration Script for Standard Fee Types
# This script runs the database migration and seeds standard fee types

echo "🚀 Starting auto migration for Standard Fee Types..."

# Change to backend directory
cd "$(dirname "$0")/backend"

echo "📁 Current directory: $(pwd)"

# Run migration
echo "🔄 Running database migration..."
go run cmd/api/main.go migrate

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

# Seed standard fee types
echo "🌱 Seeding standard fee types..."
go run cmd/api/main.go seed-standard-fee-types

if [ $? -eq 0 ]; then
    echo "✅ Standard fee types seeded successfully"
else
    echo "❌ Failed to seed standard fee types"
    exit 1
fi

echo "🎉 Auto migration completed successfully!"
echo ""
echo "📋 Summary:"
echo "   ✅ Database migration completed"
echo "   ✅ Standard fee types seeded"
echo ""
echo "🔗 Available fee types include:"
echo "   • Field Work"
echo "   • Extra Lessons" 
echo "   • Holiday Lessons"
echo "   • Handling Fee"
echo "   • Mocks"
echo "   • And many more..."
echo ""
echo "🌐 You can now access fee types via API:"
echo "   GET /api/v1/fee-types"
echo "   GET /api/v1/fee-types/by-level?level=Primary"
echo "   GET /api/v1/fee-types/categories"
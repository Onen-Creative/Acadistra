#!/bin/bash
# Quick setup - Run this on VPS to prepare for migration

cd "/home/od/workspace/programming/school management system"

echo "Checking if migration scripts exist..."
if [ -f "complete-migration.sh" ]; then
    echo "✓ Migration scripts already present"
    echo ""
    echo "Ready to run migration!"
    echo ""
    echo "Run: sudo ./complete-migration.sh"
else
    echo "✗ Migration scripts not found"
    echo ""
    echo "Please ensure these files are uploaded to VPS:"
    echo "  - complete-migration.sh"
    echo "  - rollback.sh"
    echo ""
    echo "Or commit and push changes, then run 'git pull' on VPS"
fi

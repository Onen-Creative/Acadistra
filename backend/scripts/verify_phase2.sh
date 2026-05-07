#!/bin/bash

# Phase 2 Repository Layer Verification Script
# This script verifies that all repositories are properly created and compile

set -e

echo "=========================================="
echo "Phase 2: Repository Layer Verification"
echo "=========================================="
echo ""

# Change to backend directory
cd "$(dirname "$0")/.."

echo "✓ Step 1: Checking repository directory..."
if [ -d "internal/repositories" ]; then
    echo "  ✅ Repository directory exists"
else
    echo "  ❌ Repository directory not found"
    exit 1
fi

echo ""
echo "✓ Step 2: Counting repository files..."
REPO_COUNT=$(find internal/repositories -name "*.go" -not -name "*_test.go" | wc -l)
echo "  ✅ Found $REPO_COUNT repository files"

if [ "$REPO_COUNT" -lt 20 ]; then
    echo "  ⚠️  Warning: Expected at least 20 repository files"
fi

echo ""
echo "✓ Step 3: Listing all repositories..."
find internal/repositories -name "*.go" -not -name "*_test.go" | sort | while read file; do
    basename "$file"
done | sed 's/^/  - /'

echo ""
echo "✓ Step 4: Counting lines of code..."
TOTAL_LINES=$(wc -l internal/repositories/*.go 2>/dev/null | tail -1 | awk '{print $1}')
echo "  ✅ Total lines: $TOTAL_LINES"

echo ""
echo "✓ Step 5: Checking imports..."
IMPORT_ERRORS=$(grep -r "school-management/internal/models" internal/repositories/ 2>/dev/null | wc -l)
if [ "$IMPORT_ERRORS" -gt 0 ]; then
    echo "  ❌ Found incorrect imports (should use github.com/school-system/backend/internal/models)"
    exit 1
else
    echo "  ✅ All imports are correct"
fi

echo ""
echo "✓ Step 6: Compiling repositories..."
if go build ./internal/repositories/... 2>&1; then
    echo "  ✅ All repositories compile successfully"
else
    echo "  ❌ Compilation failed"
    exit 1
fi

echo ""
echo "✓ Step 7: Checking for README..."
if [ -f "internal/repositories/README.md" ]; then
    echo "  ✅ README.md exists"
else
    echo "  ⚠️  Warning: README.md not found"
fi

echo ""
echo "✓ Step 8: Verifying key repositories exist..."
REQUIRED_REPOS=(
    "student_repository.go"
    "class_repository.go"
    "guardian_repository.go"
    "staff_repository.go"
    "user_repository.go"
    "school_repository.go"
    "fees_repository.go"
    "finance_repository.go"
    "payroll_repository.go"
    "library_repository.go"
    "clinic_repository.go"
    "attendance_repository.go"
)

MISSING=0
for repo in "${REQUIRED_REPOS[@]}"; do
    if [ -f "internal/repositories/$repo" ]; then
        echo "  ✅ $repo"
    else
        echo "  ❌ $repo (missing)"
        MISSING=$((MISSING + 1))
    fi
done

if [ $MISSING -gt 0 ]; then
    echo ""
    echo "  ❌ $MISSING required repositories are missing"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Phase 2 Verification: PASSED"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Repository files: $REPO_COUNT"
echo "  - Total lines: $TOTAL_LINES"
echo "  - Compilation: SUCCESS"
echo "  - All required repositories: PRESENT"
echo ""
echo "Next Steps:"
echo "  1. Review backend/PHASE_2_SUMMARY.md"
echo "  2. Read backend/internal/repositories/README.md"
echo "  3. Proceed to Phase 2B (Handler Integration)"
echo ""

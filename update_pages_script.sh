#!/bin/bash

# Script to update all pages to use term store
# This script adds the import and replaces local term state with the store

FRONTEND_DIR="/home/od/workspace/programming/school management system/frontend/src/app"

# Find all page.tsx files
find "$FRONTEND_DIR" -name "page.tsx" -type f | while read -r file; do
    # Skip if already has useTermStore
    if grep -q "useTermStore" "$file"; then
        echo "✓ Already updated: $file"
        continue
    fi
    
    # Check if file has term/year state
    if grep -q "useState.*Term\|useState.*year" "$file"; then
        echo "→ Updating: $file"
        
        # Create backup
        cp "$file" "$file.backup"
        
        # Add import if not present
        if ! grep -q "import.*useTermStore" "$file"; then
            sed -i "/import.*useState/a import { useTermStore } from '@/stores/termStore'" "$file"
        fi
        
        # Replace term state declarations
        sed -i "s/const \[term, setTerm\] = useState([^)]*)/const { currentTerm, currentYear } = useTermStore()/g" "$file"
        sed -i "s/const \[selectedTerm, setSelectedTerm\] = useState([^)]*)/const { currentTerm, currentYear } = useTermStore()/g" "$file"
        sed -i "s/const \[year, setYear\] = useState([^)]*)/\/\/ Using currentYear from useTermStore/g" "$file"
        sed -i "s/const \[selectedYear, setSelectedYear\] = useState([^)]*)/\/\/ Using currentYear from useTermStore/g" "$file"
        
        # Replace variable references
        sed -i "s/\bterm\b/currentTerm/g" "$file"
        sed -i "s/\byear\b/currentYear/g" "$file"
        sed -i "s/selectedTerm/currentTerm/g" "$file"
        sed -i "s/selectedYear/currentYear/g" "$file"
        
        echo "✓ Updated: $file"
    fi
done

echo ""
echo "Migration complete! Please review the changes and test the application."

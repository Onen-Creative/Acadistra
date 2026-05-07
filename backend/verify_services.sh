#!/bin/bash

# Service-Handler Method Verification Script
# This script checks if services have all methods required by their handlers

cd "/home/od/workspace/programming/school management system/backend/internal"

echo "=== SERVICE-HANDLER METHOD VERIFICATION ==="
echo ""

# Function to check if service has required methods
check_service() {
    local handler_file=$1
    local service_file=$2
    local handler_name=$(basename "$handler_file" _handler.go)
    
    if [ ! -f "$service_file" ]; then
        echo "❌ MISSING SERVICE: $service_file"
        return
    fi
    
    echo "Checking: $handler_name"
    echo "Handler: $handler_file"
    echo "Service: $service_file"
    
    # Extract handler methods
    handler_methods=$(grep -E "^func \(h \*.*Handler\)" "$handler_file" | sed 's/func (h \*[^)]*) //' | sed 's/(.*$//' | sort)
    
    # Extract service methods
    service_methods=$(grep -E "^func \(s \*.*Service\)" "$service_file" | sed 's/func (s \*[^)]*) //' | sed 's/(.*$//' | sort)
    
    echo "Handler methods:"
    echo "$handler_methods"
    echo ""
    echo "Service methods:"
    echo "$service_methods"
    echo ""
    
    # Check for missing methods
    missing=0
    while IFS= read -r method; do
        if ! echo "$service_methods" | grep -q "^$method$"; then
            echo "  ⚠️  Missing in service: $method"
            ((missing++))
        fi
    done <<< "$handler_methods"
    
    if [ $missing -eq 0 ]; then
        echo "  ✅ All methods present"
    else
        echo "  ❌ $missing methods missing"
    fi
    echo "---"
    echo ""
}

# Check major handlers
check_service "handlers/finance_handler.go" "services/finance_service.go"
check_service "handlers/fees_handler.go" "services/fees_service.go"
check_service "handlers/budget_handler.go" "services/budget_service.go"
check_service "handlers/inventory_handler.go" "services/inventory_service.go"
check_service "handlers/parent_handler.go" "services/parent_service.go"
check_service "handlers/library_handler.go" "services/library_service.go"
check_service "handlers/clinic_handler.go" "services/clinic_service.go"
check_service "handlers/staff_handler.go" "services/staff_service.go"
check_service "handlers/result_handler.go" "services/result_service.go"

echo "=== VERIFICATION COMPLETE ==="

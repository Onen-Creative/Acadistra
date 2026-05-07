#!/usr/bin/env python3
"""
Safe refactoring script for main.go
This script replaces route definitions with the new routes package
"""

import sys

def refactor_main_go(input_file, output_file):
    with open(input_file, 'r') as f:
        lines = f.readlines()
    
    # Find the import section end
    import_end = 0
    for i, line in enumerate(lines):
        if line.strip() == ')' and i < 30:  # Import section ends early
            import_end = i
            break
    
    # Add the new import before the closing parenthesis
    new_import = '\t"github.com/school-system/backend/internal/routes"\n'
    lines.insert(import_end, new_import)
    
    # Find where routes start (after "// Static files")
    routes_start = 0
    for i, line in enumerate(lines):
        if '// Health check - simple endpoint' in line:
            routes_start = i
            break
    
    # Find where routes end (before "addr := fmt.Sprintf")
    routes_end = 0
    for i, line in enumerate(lines):
        if 'addr := fmt.Sprintf' in line:
            routes_end = i
            break
    
    # Create the new routes section
    new_routes = '''
\t// Initialize all services for routes
\tsmsService := services.NewSMSService(
\t\tos.Getenv("AFRICASTALKING_API_KEY"),
\t\tos.Getenv("AFRICASTALKING_USERNAME"),
\t\tos.Getenv("AFRICASTALKING_SENDER_ID"),
\t)
\tnotificationService := services.NewNotificationService(db, smsService, emailService)
\tpayrollService := services.NewPayrollService(db)

\t// Setup all routes using the new routes package
\troutes.SetupRoutes(r, &routes.Dependencies{
\t\tDB:                  db,
\t\tConfig:              cfg,
\t\tAuthService:         authService,
\t\tMonitoringService:   monitoringService,
\t\tEmailService:        emailService,
\t\tPayrollService:      payrollService,
\t\tSMSService:          smsService,
\t\tNotificationService: notificationService,
\t})

'''
    
    # Replace the routes section
    new_lines = lines[:routes_start] + [new_routes] + lines[routes_end:]
    
    # Write the new file
    with open(output_file, 'w') as f:
        f.writelines(new_lines)
    
    print(f"✅ Refactored main.go created successfully")
    print(f"   Lines before: {len(lines)}")
    print(f"   Lines after: {len(new_lines)}")
    print(f"   Lines removed: {len(lines) - len(new_lines)}")

if __name__ == '__main__':
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    refactor_main_go(input_file, output_file)

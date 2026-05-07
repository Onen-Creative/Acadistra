# Handler Refactoring Status

## Goal
Ensure all handlers use services and repositories instead of direct DB connections.

## Pattern
```go
type XHandler struct {
    service *services.XService  // Use service, not db
}

func NewXHandler(service *services.XService) *XHandler {
    return &XHandler{service: service}
}
```

## Status by Handler

### ✅ Already Refactored
- staff_handler.go - Uses StaffService

### 🔧 Needs Refactoring
- analytics_handler.go - Uses direct DB (acceptable for complex analytics queries)
- announcement_handler.go - Uses direct DB, has service available
- student_handler.go - Has both db and svc, needs cleanup
- teacher_handler.go - Uses direct DB
- user_handler.go - Uses direct DB
- parent_handler.go - Needs check
- guardian_handler.go - Needs check
- clinic_handler.go - Needs check
- library_handler.go - Needs check
- finance_handler.go - Needs check
- fees_handler.go - Needs check
- inventory_handler.go - Needs check
- payroll_handler.go - Needs check
- attendance_handler.go - Needs check
- class_handler.go - Needs check
- subject_handler.go - Needs check
- result_handler.go - Needs check
- reports_handler.go - Needs check
- settings_handler.go - Needs check
- school_handler.go - Needs check
- term_dates_handler.go - Needs check
- lesson_handler.go - Needs check
- budget_handler.go - Needs check
- audit_handler.go - Needs check
- notification_handler.go - Needs check
- registration_handler.go - Needs check

### ⚠️ Special Cases
- bulk_*_handler.go - Bulk operations may need direct DB for performance
- *_export_handler.go - Export handlers may need direct DB for performance
- websocket_handler.go - Real-time, may need direct DB
- system_*_handler.go - System-level handlers
- web_vitals_handler.go - Monitoring
- email_monitor_handler.go - Monitoring
- integration_activity_handler.go - Integration logging
- payment_handler.go - Payment processing
- password_reset_handler.go - Auth flow

## Priority Order
1. Core CRUD handlers (student, teacher, user, parent, guardian)
2. Academic handlers (class, subject, result, attendance)
3. Financial handlers (fees, finance, payroll, inventory)
4. Supporting handlers (clinic, library, lesson, term_dates)
5. System handlers (settings, school, audit, notification)

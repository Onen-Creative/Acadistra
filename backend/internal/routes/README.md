# Safe Refactoring Guide - Routes Organization

## 🎯 Objective
Organize the codebase by extracting routes from `main.go` into separate files **WITHOUT breaking any existing functionality**.

## ✅ What We've Done

Created a new `internal/routes/` package with the following structure:

```
internal/routes/
├── routes.go           # Main setup function
├── public_routes.go    # Health checks, setup endpoints
├── auth_routes.go      # Authentication routes
├── protected_routes.go # System admin & school admin routes
├── role_routes.go      # All other role-based routes
└── helpers.go          # Helper functions for inline handlers
```

## 🔄 How to Apply (Step-by-Step)

### Step 1: Test Current System
Before making any changes, ensure everything works:
```bash
cd backend
go test ./...
go run cmd/api/main.go
```

### Step 2: Update main.go (Minimal Change)

**Option A: Side-by-side (Safest)**
Keep both old and new routes temporarily:

```go
// In main.go, after line ~110 where routes start

// NEW: Use organized routes
routes.SetupRoutes(r, &routes.Dependencies{
    DB:                  db,
    Config:              cfg,
    AuthService:         authService,
    MonitoringService:   monitoringService,
    EmailService:        emailService,
    PayrollService:      payrollService,
    SMSService:          smsService,
    NotificationService: notificationService,
})

// OLD: Comment out existing route definitions (lines ~110-800)
// Keep them commented for 1-2 weeks as backup
/*
v1 := r.Group("/api/v1")
{
    auth := v1.Group("/auth")
    ...
}
*/
```

**Option B: Direct replacement (After testing)**
Replace all route definitions (lines ~110-800) with:

```go
routes.SetupRoutes(r, &routes.Dependencies{
    DB:                  db,
    Config:              cfg,
    AuthService:         authService,
    MonitoringService:   monitoringService,
    EmailService:        emailService,
    PayrollService:      payrollService,
    SMSService:          smsService,
    NotificationService: notificationService,
})
```

### Step 3: Add Missing Imports

Add to imports in `main.go`:
```go
import (
    // ... existing imports ...
    "github.com/school-system/backend/internal/routes"
)
```

### Step 4: Test Thoroughly

```bash
# 1. Build
go build -o main cmd/api/main.go

# 2. Run
./main

# 3. Test key endpoints
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/v1/auth/login -d '{"email":"...","password":"..."}'

# 4. Test in browser
# - Login as different roles
# - Test student management
# - Test marks entry
# - Test reports generation
```

### Step 5: Monitor Production

If deploying to production:
1. Deploy during low-traffic hours
2. Monitor logs for errors
3. Keep old version ready for rollback
4. Test critical workflows immediately after deployment

## 🔍 What Changed?

### Before:
```
main.go (1400+ lines)
├── All route definitions
├── All handler initializations
├── All middleware setup
└── Inline handler functions
```

### After:
```
main.go (~600 lines)
└── routes.SetupRoutes() call

internal/routes/
├── Organized by concern
├── Easy to find routes
└── Maintainable structure
```

## ✨ Benefits

1. **No Functionality Change** - Same routes, same handlers, same behavior
2. **Better Organization** - Routes grouped by role/domain
3. **Easier Maintenance** - Find routes quickly
4. **Easier Testing** - Can test route groups independently
5. **Reduced main.go** - From 1400 to ~600 lines

## 🚨 Rollback Plan

If something breaks:

### Quick Rollback:
```go
// In main.go, comment out new routes:
// routes.SetupRoutes(r, &routes.Dependencies{...})

// Uncomment old routes:
v1 := r.Group("/api/v1")
{
    auth := v1.Group("/auth")
    ...
}
```

### Git Rollback:
```bash
git revert <commit-hash>
git push
```

## 📋 Verification Checklist

After applying changes, verify:

- [ ] Application starts without errors
- [ ] Health check works: `GET /health`
- [ ] Login works for all roles
- [ ] System admin can access admin routes
- [ ] School admin can manage students
- [ ] Teachers can enter marks
- [ ] Parents can view children's data
- [ ] Bursar can manage fees
- [ ] Librarian can manage books
- [ ] Nurse can manage clinic
- [ ] Reports generate correctly
- [ ] File uploads work
- [ ] Notifications work
- [ ] WebSocket connections work

## 🔧 Troubleshooting

### Issue: "undefined: routes"
**Solution**: Add import: `"github.com/school-system/backend/internal/routes"`

### Issue: "cannot use ... as type Dependencies"
**Solution**: Ensure all services are initialized before calling SetupRoutes

### Issue: Routes not working
**Solution**: Check that middleware is applied correctly in route files

### Issue: Handler not found
**Solution**: Verify handler is initialized in the correct route file

## 📝 Next Steps (Future Refactoring)

After routes are stable, consider:

1. **Add Repository Layer** (Phase 2)
   - Extract database logic from handlers
   - Create repository interfaces

2. **Expand Service Layer** (Phase 3)
   - Move business logic from handlers to services
   - Create service interfaces

3. **Add DTOs** (Phase 4)
   - Request/Response validation objects
   - Separate API models from database models

## 💡 Tips

- **Test locally first** - Don't deploy untested changes
- **Deploy gradually** - Test in staging before production
- **Monitor closely** - Watch logs after deployment
- **Keep backups** - Have rollback plan ready
- **Document changes** - Update team on new structure

## 🤝 Support

If you encounter issues:
1. Check the verification checklist
2. Review troubleshooting section
3. Test with curl/Postman
4. Check application logs
5. Rollback if needed

---

**Remember**: This refactoring changes **structure only**, not **functionality**. All endpoints work exactly the same way.

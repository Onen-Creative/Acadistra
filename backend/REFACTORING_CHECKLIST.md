# Refactoring Checklist - Print This!

## Pre-Refactoring

- [ ] Read QUICK_START.md
- [ ] Read internal/routes/README.md
- [ ] Current system is working
- [ ] All tests pass
- [ ] No pending changes in git

## Backup Phase

- [ ] Run: `./scripts/refactor_routes.sh`
- [ ] Backup file created successfully
- [ ] Note backup filename: ___________________________

## Code Changes

- [ ] Open cmd/api/main.go
- [ ] Add import: `"github.com/school-system/backend/internal/routes"`
- [ ] Find route definitions (around line 110)
- [ ] Delete old route definitions (~800 lines)
- [ ] Add new routes.SetupRoutes() call
- [ ] Verify Dependencies struct has all services
- [ ] Save file

## Build & Test

- [ ] Run: `go build -o main cmd/api/main.go`
- [ ] Build successful (no errors)
- [ ] Run: `./main`
- [ ] Server starts without errors
- [ ] No panic in logs

## Endpoint Testing

### Basic Endpoints
- [ ] GET /health returns 200
- [ ] GET / returns 200
- [ ] GET /swagger/index.html loads

### Authentication
- [ ] POST /api/v1/auth/login (system admin)
- [ ] POST /api/v1/auth/login (school admin)
- [ ] POST /api/v1/auth/login (teacher)
- [ ] POST /api/v1/auth/login (parent)
- [ ] POST /api/v1/auth/refresh works
- [ ] POST /api/v1/auth/logout works

### System Admin Routes
- [ ] GET /api/v1/schools
- [ ] GET /api/v1/users
- [ ] GET /api/v1/monitoring/system-stats
- [ ] GET /api/v1/audit-logs

### School Admin Routes
- [ ] GET /api/v1/dashboard/summary
- [ ] GET /api/v1/school-users
- [ ] GET /api/v1/staff
- [ ] POST /api/v1/students

### Teacher Routes
- [ ] GET /api/v1/students
- [ ] GET /api/v1/classes
- [ ] POST /api/v1/results
- [ ] GET /api/v1/marks/imports

### Parent Routes
- [ ] GET /api/v1/parent/dashboard
- [ ] GET /api/v1/parent/children/:id

### Bursar Routes
- [ ] GET /api/v1/fees
- [ ] GET /api/v1/finance/summary
- [ ] POST /api/v1/fees/payment

### Librarian Routes
- [ ] GET /api/v1/library/books
- [ ] POST /api/v1/library/issue

### Nurse Routes
- [ ] GET /api/v1/clinic/visits
- [ ] GET /api/v1/clinic/medicines

### Common Routes
- [ ] GET /api/v1/notifications
- [ ] GET /api/v1/attendance
- [ ] GET /api/v1/subjects
- [ ] POST /api/v1/upload/logo

## Browser Testing

- [ ] Login as system admin
- [ ] Login as school admin
- [ ] Login as teacher
- [ ] Login as parent
- [ ] View students list
- [ ] Register new student
- [ ] Enter marks
- [ ] Generate report
- [ ] Record payment
- [ ] Upload file
- [ ] View notifications

## Performance Check

- [ ] Response times normal
- [ ] No memory leaks
- [ ] No CPU spikes
- [ ] Database queries efficient

## Git Commit

- [ ] Stage changes: `git add .`
- [ ] Commit: `git commit -m "refactor: organize routes into separate files"`
- [ ] Push to feature branch (not main yet!)

## Staging Deployment

- [ ] Deploy to staging environment
- [ ] Run all tests again in staging
- [ ] Monitor logs for 30 minutes
- [ ] Test critical workflows
- [ ] No errors in logs

## Production Deployment

- [ ] Schedule deployment (low-traffic time)
- [ ] Notify team
- [ ] Deploy to production
- [ ] Monitor logs immediately
- [ ] Test critical endpoints
- [ ] Monitor for 1 hour
- [ ] Monitor for 24 hours
- [ ] Monitor for 1 week

## Post-Deployment

- [ ] All systems operational
- [ ] No error reports from users
- [ ] Performance metrics normal
- [ ] Logs clean
- [ ] Team notified of success

## Cleanup (After 1 Week)

- [ ] Remove commented code from main.go
- [ ] Delete backup files
- [ ] Update documentation
- [ ] Merge to main branch
- [ ] Tag release

## Rollback (If Needed)

- [ ] Stop application
- [ ] Restore backup: `cp cmd/api/main.go.backup.* cmd/api/main.go`
- [ ] Rebuild: `go build -o main cmd/api/main.go`
- [ ] Restart application
- [ ] Verify working
- [ ] Investigate issue
- [ ] Fix and retry

---

## Notes Section

**Date Started:** _______________
**Date Completed:** _______________
**Deployed By:** _______________
**Issues Encountered:** 

_______________________________________________
_______________________________________________
_______________________________________________

**Resolution:**

_______________________________________________
_______________________________________________
_______________________________________________

---

## Sign-Off

- [ ] Developer: _______________  Date: _______________
- [ ] Tester: _______________     Date: _______________
- [ ] Reviewer: _______________   Date: _______________

---

**Status:** 
- [ ] In Progress
- [ ] Testing
- [ ] Deployed to Staging
- [ ] Deployed to Production
- [ ] Completed Successfully
- [ ] Rolled Back (see notes)

---

**Print this checklist and check off items as you complete them!**

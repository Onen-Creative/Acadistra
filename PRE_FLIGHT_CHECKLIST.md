# PRE-FLIGHT DEPLOYMENT CHECKLIST
## Acadistra Production Deployment - Version 2.0.0

**Deployment Date**: ________________  
**Deployed By**: ________________  
**Start Time**: ________________

---

## ⏰ TIMING & SCHEDULING

- [ ] **Off-peak hours selected** (Recommended: 11 PM - 2 AM)
- [ ] **Maintenance window**: _____ hours allocated
- [ ] **Users notified** 24-48 hours in advance
- [ ] **Notification sent** with expected downtime

---

## 💾 BACKUP CHECKLIST

- [ ] **Database backup script tested** within last 7 days
- [ ] **Backup storage verified** - Minimum 5GB available
- [ ] **Previous backups accessible** and tested
- [ ] **Backup location documented**: ________________
- [ ] **Restore procedure tested** (on staging/dev)

---

## 🔧 SYSTEM REQUIREMENTS

### Server Resources
- [ ] **Disk space**: Minimum 10GB free
- [ ] **RAM**: Minimum 4GB available
- [ ] **CPU**: Load average < 2.0
- [ ] **Docker version**: 20.10+ installed
- [ ] **Docker Compose**: 2.0+ installed

### Connectivity
- [ ] **Git access**: Can pull from repository
- [ ] **Internet access**: For npm packages
- [ ] **Database connection**: PostgreSQL accessible
- [ ] **Domain DNS**: Properly configured

### Permissions
- [ ] **Root/sudo access**: Available
- [ ] **Docker permissions**: User in docker group
- [ ] **File permissions**: Can write to app directory

---

## 📦 CODEBASE CHECKS

- [ ] **Local changes stashed**: `git status` clean
- [ ] **Remote branch updated**: Latest commits pushed
- [ ] **No merge conflicts**: Repository clean
- [ ] **TypeScript compiles**: Frontend builds locally
- [ ] **Go compiles**: Backend builds locally
- [ ] **Tests passing**: All critical tests pass

---

## 🗄️ DATABASE CHECKS

- [ ] **Database accessible**: Can connect via psql
- [ ] **No active queries**: Check `pg_stat_activity`
- [ ] **Sufficient connections**: Max connections not reached
- [ ] **Recent backup exists**: Within last 24 hours
- [ ] **Migration files present**: All in `backend/migrations/`

### Critical Migrations to Deploy
- [ ] `20260702000000_make_classes_yearly.sql`
- [ ] `20260703000000_make_enrollments_yearly.sql`
- [ ] `20260501000000_system_monitoring.sql` (if not applied)

---

## 🧪 PRE-DEPLOYMENT TESTING

### Development/Staging Tests
- [ ] **Yearly classes**: Tested and working
- [ ] **Yearly enrollment**: Tested and working
- [ ] **Monitoring system**: Fully functional
- [ ] **Response times**: Showing decimals
- [ ] **Session tracking**: Working correctly
- [ ] **User login**: No authentication issues
- [ ] **Database queries**: Optimized and fast

### Load Testing (Optional but Recommended)
- [ ] **Concurrent users**: System handles expected load
- [ ] **API response times**: Under 500ms average
- [ ] **Database queries**: No slow queries (>1s)

---

## 👥 STAKEHOLDER COMMUNICATION

- [ ] **Users notified**: Email/SMS sent
- [ ] **Support team briefed**: On changes
- [ ] **Admin users contacted**: System admin aware
- [ ] **Emergency contacts**: List prepared
- [ ] **Rollback plan**: Communicated to team

---

## 🔐 SECURITY CHECKS

- [ ] **Environment variables**: Properly configured
- [ ] **Secrets updated**: No hardcoded passwords
- [ ] **SSL certificates**: Valid and not expiring
- [ ] **Firewall rules**: Properly configured
- [ ] **Backup encryption**: Enabled if sensitive data

---

## 📊 MONITORING SETUP

- [ ] **Monitoring tools**: Ready to track deployment
- [ ] **Log aggregation**: Configured (if available)
- [ ] **Alert system**: Set up for critical errors
- [ ] **Performance baseline**: Current metrics documented

### Current Baseline (Fill before deployment)
```
Current Active Users: _______
Current Response Time: _______
Current Error Rate: _______
Current Database Size: _______
Current API Request Rate: _______
```

---

## 🛠️ TOOLS & ACCESS

- [ ] **SSH access**: To production server
- [ ] **Docker access**: Can run docker commands
- [ ] **Database access**: Can run psql commands
- [ ] **Git access**: Can pull from repository
- [ ] **Browser access**: To test frontend
- [ ] **API testing tool**: cURL or Postman ready

---

## 📝 DOCUMENTATION READY

- [ ] **Deployment script**: `deploy-production.sh` tested
- [ ] **Deployment guide**: `PRODUCTION_DEPLOYMENT_GUIDE.md` reviewed
- [ ] **Quick reference**: `DEPLOYMENT_QUICK_REFERENCE.md` available
- [ ] **Rollback procedure**: Documented and understood
- [ ] **Monitoring guide**: `MONITORING_GUIDE.md` accessible

---

## 🎯 DEPLOYMENT GOALS

### What This Deployment Includes
- [ ] **Yearly Classes System**: Classes now have year attribute
- [ ] **Yearly Enrollment**: Enrollments tied to specific years
- [ ] **System Monitoring**: Full monitoring with accurate metrics
- [ ] **Response Time Fix**: Shows decimal precision (not 0ms)
- [ ] **Session Duration Fix**: Shows minutes/hours (not 0m)
- [ ] **Session Expiration**: Auto-expires after 2 hours
- [ ] **Daily Reports**: Automated generation at 1 AM

### Expected Outcomes
- [ ] Classes filterable by year
- [ ] Students enrollable per year
- [ ] Monitoring dashboard functional
- [ ] All metrics accurate and real-time
- [ ] No data loss
- [ ] All existing features working

---

## ⚠️ RISK ASSESSMENT

### High Risk Items
- [ ] **Database migration**: Can break system if fails
  - **Mitigation**: Tested on staging, backup ready
- [ ] **Data integrity**: Yearly system changes data model
  - **Mitigation**: Migrations preserve existing data
- [ ] **Downtime**: Users unable to access system
  - **Mitigation**: Off-peak deployment window

### Medium Risk Items
- [ ] **Frontend build**: May fail due to dependencies
  - **Mitigation**: Test build locally first
- [ ] **Session tracking**: New monitoring may have bugs
  - **Mitigation**: Can disable if critical issues arise

### Low Risk Items
- [ ] **Monitoring reports**: Non-critical feature
  - **Mitigation**: Can regenerate manually if needed

---

## 🚨 ROLLBACK CRITERIA

**Rollback immediately if**:
- [ ] Migration fails and can't be fixed in 15 minutes
- [ ] System won't start after deployment
- [ ] Critical data loss detected
- [ ] Login system completely broken
- [ ] Error rate exceeds 50% for 5+ minutes

**Consider rollback if**:
- [ ] Response time increased by 200%+
- [ ] Multiple users reporting critical issues
- [ ] Database performance degraded significantly
- [ ] Monitoring shows system unstable

---

## ✅ FINAL CHECKS (Right Before Deployment)

### 15 Minutes Before
- [ ] **All checklist items completed**
- [ ] **Team on standby** for support
- [ ] **Monitoring dashboard** open and ready
- [ ] **Terminal windows** prepared (3-4 windows)
- [ ] **Documentation** open for reference

### 5 Minutes Before
- [ ] **Final backup** completed
- [ ] **Services status** checked
- [ ] **Disk space** verified one last time
- [ ] **Users notified** "Maintenance starting"

### Go/No-Go Decision
- [ ] **All green lights**: Proceed with deployment
- [ ] **Any red flags**: Postpone and investigate

---

## 📋 POST-DEPLOYMENT CHECKLIST

*To be completed after deployment*

- [ ] Services running
- [ ] Backend responding
- [ ] Frontend accessible
- [ ] Database queries working
- [ ] Monitoring dashboard operational
- [ ] Response times accurate
- [ ] Session tracking working
- [ ] Yearly classes visible
- [ ] Users can login
- [ ] No critical errors in logs

---

## 📞 EMERGENCY CONTACTS

**Technical Team**:
- Primary: ________________ (Phone: ______________)
- Secondary: ________________ (Phone: ______________)
- Database Admin: ________________ (Phone: ______________)

**Business Contacts**:
- School Admin: ________________ (Phone: ______________)
- Management: ________________ (Phone: ______________)

**External Support**:
- Hosting Provider: ________________
- Database Support: ________________

---

## 📝 NOTES SECTION

**Pre-Deployment Concerns**:
_____________________________________________________
_____________________________________________________
_____________________________________________________

**Special Instructions**:
_____________________________________________________
_____________________________________________________
_____________________________________________________

**Team Comments**:
_____________________________________________________
_____________________________________________________
_____________________________________________________

---

## ✍️ SIGN-OFF

**Prepared By**:  
Name: ________________  
Signature: ________________  
Date: ________________

**Approved By**:  
Name: ________________  
Signature: ________________  
Date: ________________

**Technical Lead**:  
Name: ________________  
Signature: ________________  
Date: ________________

---

## 🎯 DEPLOYMENT AUTHORIZATION

I confirm that:
- [ ] All checklist items are completed
- [ ] All risks are understood and mitigated
- [ ] Rollback procedure is ready
- [ ] Team is prepared for deployment
- [ ] I authorize proceeding with deployment

**Authorized By**: ________________  
**Date/Time**: ________________  
**Signature**: ________________

---

**⚠️ DO NOT PROCEED WITHOUT COMPLETING THIS CHECKLIST**

**Status**: [ ] READY [ ] NOT READY [ ] POSTPONED

**If NOT READY, reason**: ________________

---

**Good luck with your deployment! 🚀**

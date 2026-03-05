# Production Readiness Checklist

Use this checklist before deploying Acadistra to production.

## Infrastructure ✅

- [ ] Server provisioned (Ubuntu 22.04, 2GB+ RAM recommended)
- [ ] Domain name registered and configured
- [ ] DNS A records pointing to server IP
- [ ] SSH access configured with key authentication
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] Docker and Docker Compose installed
- [ ] Sufficient disk space (20GB+ recommended)

## Security 🔒

- [ ] Strong PostgreSQL password set (32+ characters)
- [ ] Strong Redis password set (32+ characters)
- [ ] Strong MinIO password set (32+ characters)
- [ ] JWT secret is 64+ characters
- [ ] Default admin password changed after first login
- [ ] SSH root login disabled
- [ ] SSH password authentication disabled
- [ ] Firewall (ufw) enabled and configured
- [ ] SSL/HTTPS configured via Caddy
- [ ] Environment variables secured (not in git)

## Application 🚀

- [ ] Repository cloned to server
- [ ] `.env.production` configured with secure values
- [ ] Docker images built successfully
- [ ] All services started and healthy
- [ ] Database migrations completed
- [ ] System admin user created
- [ ] Standard subjects seeded
- [ ] First school created and tested
- [ ] School admin user created and tested
- [ ] Basic functionality tested (login, create student, etc.)

## Monitoring & Backup 📊

- [ ] Health check script tested (`./health-check.sh`)
- [ ] Backup script tested (`./scripts/backup.sh`)
- [ ] Automated backups scheduled (cron job)
- [ ] Backup restoration tested
- [ ] Log rotation configured
- [ ] Disk space monitoring set up
- [ ] Service monitoring configured

## Performance ⚡

- [ ] Database indexes verified
- [ ] Redis memory limit configured
- [ ] Static assets optimized
- [ ] CDN configured (optional)
- [ ] Caching headers configured
- [ ] Database connection pooling configured

## Documentation 📚

- [ ] README.md reviewed
- [ ] QUICKSTART.md accessible to team
- [ ] DEPLOYMENT.md followed
- [ ] API documentation accessible
- [ ] Admin credentials documented securely
- [ ] Runbook created for common operations

## Testing ✓

- [ ] Login/logout works
- [ ] User creation works
- [ ] School creation works
- [ ] Student registration works
- [ ] Marks entry works
- [ ] Report generation works
- [ ] Attendance tracking works
- [ ] Finance management works
- [ ] Parent portal works
- [ ] All roles tested (Admin, Teacher, Bursar, etc.)

## Compliance 📋

- [ ] UNEB grading rules verified
- [ ] NCDC grading rules verified
- [ ] Standard subjects match curriculum
- [ ] Data privacy measures in place
- [ ] Audit logging enabled
- [ ] Terms of service prepared (if needed)
- [ ] Privacy policy prepared (if needed)

## Disaster Recovery 🆘

- [ ] Backup strategy documented
- [ ] Restore procedure documented and tested
- [ ] Emergency contacts documented
- [ ] Rollback procedure documented
- [ ] Data retention policy defined
- [ ] Incident response plan created

## Post-Deployment 🎯

- [ ] Monitor logs for errors (first 24 hours)
- [ ] Check service health regularly
- [ ] Verify backups are running
- [ ] Monitor disk space
- [ ] Monitor memory usage
- [ ] Monitor CPU usage
- [ ] Test all critical features
- [ ] Gather user feedback
- [ ] Document any issues
- [ ] Plan for scaling if needed

## Maintenance Schedule 🔧

### Daily
- [ ] Check service health
- [ ] Review error logs
- [ ] Verify backups completed

### Weekly
- [ ] Review audit logs
- [ ] Check disk space
- [ ] Review performance metrics
- [ ] Test backup restoration

### Monthly
- [ ] Update dependencies
- [ ] Security audit
- [ ] Performance review
- [ ] User feedback review
- [ ] Capacity planning

### Quarterly
- [ ] Full system audit
- [ ] Disaster recovery drill
- [ ] Security penetration test
- [ ] Documentation review

## Quick Commands Reference

```bash
# Deploy
./deploy.sh

# Health check
./health-check.sh

# View logs
make logs

# Backup
make backup

# Restart services
make restart

# Update application
make update
```

## Emergency Contacts

- System Administrator: _______________
- Database Administrator: _______________
- Security Contact: _______________
- Hosting Provider Support: _______________

## Sign-off

- [ ] Technical Lead: _____________ Date: _______
- [ ] Security Officer: _____________ Date: _______
- [ ] Operations Manager: _____________ Date: _______

---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

**Deployment Date**: ______________

**Deployed By**: ______________

**Production URL**: ______________

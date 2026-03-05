# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Disclose Publicly
Please do not open a public issue or discuss the vulnerability publicly until it has been addressed.

### 2. Report Privately
Email security details to: security@acadistra.com (or create a private security advisory on GitHub)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 3. Response Timeline
- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-3 days
  - High: 1-2 weeks
  - Medium: 2-4 weeks
  - Low: Next release cycle

## Security Measures

### Authentication & Authorization
- JWT-based authentication
- Argon2 password hashing
- Role-based access control (RBAC)
- Session management
- Token expiration and refresh

### Data Protection
- SQL injection prevention via GORM
- XSS protection
- CSRF protection
- Input validation and sanitization
- Secure password storage

### Infrastructure
- Docker containerization
- Network isolation
- Secure environment variables
- HTTPS/TLS via Caddy
- Database access restrictions

### Monitoring & Logging
- Audit logging for all actions
- Failed login attempt tracking
- System health monitoring
- Error logging and alerting

## Best Practices for Deployment

### 1. Environment Variables
- Use strong, unique passwords (32+ characters)
- Use long JWT secrets (64+ characters)
- Never commit `.env` files
- Rotate secrets regularly

### 2. Database Security
- Use strong PostgreSQL password
- Restrict database access to localhost
- Enable SSL for database connections in production
- Regular backups with encryption

### 3. Network Security
- Use firewall (ufw) to restrict ports
- Only expose ports 80, 443, and 22
- Use SSH key authentication only
- Disable root SSH login

### 4. Application Security
- Keep dependencies updated
- Regular security audits
- Monitor for vulnerabilities
- Apply security patches promptly

### 5. Backup & Recovery
- Automated daily backups
- Test backup restoration regularly
- Store backups securely off-site
- Encrypt backup files

## Security Checklist

Before deploying to production:

- [ ] Changed all default passwords
- [ ] Generated strong JWT secret (64+ chars)
- [ ] Configured firewall (ufw)
- [ ] Enabled SSH key authentication
- [ ] Disabled root SSH login
- [ ] Configured SSL/HTTPS
- [ ] Set up automated backups
- [ ] Reviewed audit logs
- [ ] Updated all dependencies
- [ ] Tested disaster recovery

## Vulnerability Disclosure Policy

We follow responsible disclosure:

1. Report received and acknowledged
2. Vulnerability verified and assessed
3. Fix developed and tested
4. Security advisory published
5. Credit given to reporter (if desired)

## Security Updates

Subscribe to security updates:
- Watch this repository
- Follow release notes
- Check CHANGELOG.md regularly

## Contact

For security concerns: security@acadistra.com

Thank you for helping keep Acadistra secure! 🔒

# Changelog

All notable changes to Acadistra will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### Added
- Complete school management system for Ugandan schools (ECCE → S6)
- Multi-tenant architecture with single shared database
- Standardized curriculum subjects (UNEB/NCDC compliant)
- Role-based access control (System Admin, School Admin, Teacher, Bursar, Librarian, Nurse, Parent)
- Student and class management
- Marks entry with offline support
- UNEB and NCDC grading engines
- PDF report card generation
- Attendance tracking with holidays and term dates
- Finance management (income and expenditure)
- Payroll system with automatic finance integration
- Budget and requisitions workflow
- Library management with book issues
- Clinic management with health profiles
- Inventory management
- Parent portal for viewing children's progress
- Audit logging for all actions
- JWT authentication
- Docker-based deployment
- Automated backup scripts
- Health check monitoring
- Comprehensive API documentation (Swagger)

### Security
- Argon2 password hashing
- JWT token authentication
- Role-based authorization
- SQL injection protection via GORM
- CORS configuration
- Secure environment variable handling

### Documentation
- Quick start guide
- Deployment guide
- API documentation
- System architecture documentation
- Contributing guidelines

## [Unreleased]

### Planned
- Mobile app (iOS/Android)
- SMS notifications via Africa's Talking
- Email notifications
- Mobile money payment integration
- Advanced analytics and reporting
- Multi-language support
- Timetable management
- Exam scheduling
- Student portal
- Teacher portal enhancements

---

For detailed changes, see the [commit history](https://github.com/yourusername/acadistra/commits/main).

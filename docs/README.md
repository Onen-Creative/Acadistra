# Acadistra Documentation

**Comprehensive School Management System for Ugandan Schools (ECCE → S6)**

---

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Core Features](#core-features)
4. [Module Documentation](#module-documentation)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)
7. [Support](#support)

---

## Quick Start Guide

### System Requirements
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)
- Internet connection (2 Mbps minimum)
- Screen resolution: 1366x768 minimum

### First Login
1. Access your school's Acadistra URL
2. Enter provided credentials
3. Change default password on first login

### Basic Setup
1. Configure school information
2. Set current term and academic year
3. Create classes
4. Register students and staff

---

## User Roles & Permissions

### System Admin
- Manage multiple schools
- System-wide configuration
- Access audit logs

### School Admin
- Full school management
- Configure settings
- Process payroll
- Generate reports

### Teacher
- Enter and view marks
- Mark attendance
- View assigned classes

### Bursar
- Record fees payments
- Financial reports
- Manage income/expenditure

### Librarian
- Manage books
- Issue/return books
- Track overdue items

### Nurse
- Record patient visits
- Manage health profiles
- Track medicine inventory

### Parent/Guardian
- View child's results
- Check attendance
- Pay fees via mobile money
- Receive notifications

---

## Core Features

### Student Management
- Individual and bulk registration
- Complete student profiles
- Guardian management
- Class enrollment

### Academic Management
- Marks entry (offline-capable)
- UNEB/NCDC compliant grading
- Automated report card generation
- Subject management

### Fees & Finance
- Fees structure configuration
- Payment recording
- Mobile money integration (MTN, Airtel)
- Income/expenditure tracking
- Financial reports

### Attendance Tracking
- Daily attendance marking
- Automated parent notifications
- Attendance reports
- Trend analysis

### Additional Modules
- Library management
- Clinic/health management
- Payroll processing
- Inventory management

---

## Module Documentation

### Marks Entry

**Offline Functionality:**
- Marks saved locally in browser
- Works without internet connection
- Auto-sync when connection restored
- Conflict resolution

**Process:**
1. Select class, subject, assessment type
2. Enter marks (0-100)
3. Save locally
4. Submit to server when online

### Report Card Generation

**Features:**
- UNEB/NCDC compliant formats
- Automatic grade calculation
- Class position computation
- Teacher/Head teacher comments
- Attendance summary
- Fees balance

**Generation Time:** 1-2 minutes per class

### Mobile Money Integration

**Supported Networks:**
- MTN Mobile Money
- Airtel Money

**Payment Flow:**
1. Parent initiates payment from portal
2. System sends request to payment gateway
3. Parent receives mobile prompt
4. Parent confirms with PIN
5. Payment automatically recorded
6. Receipt sent via SMS
7. Income record created

### Payroll System

**Features:**
- Salary structure configuration
- Automatic PAYE/NSSF calculation
- Monthly payroll processing
- Payslip generation
- Finance integration

---

## API Reference

### Authentication

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "user@acadistra.com",
  "password": "password"
}
```

**Response:**
```json
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "user": {
    "id": "uuid",
    "email": "user@acadistra.com",
    "role": "teacher"
  }
}
```

### Students

- `GET /api/v1/students` - List students
- `POST /api/v1/students` - Create student
- `GET /api/v1/students/:id` - Get student details
- `PUT /api/v1/students/:id` - Update student
- `DELETE /api/v1/students/:id` - Delete student

### Marks

- `POST /api/v1/marks` - Submit marks
- `GET /api/v1/marks` - Get marks
- `PUT /api/v1/marks/:id` - Update marks

### Fees

- `POST /api/v1/fees/payment` - Record payment
- `GET /api/v1/fees/student/:id` - Get student fees
- `GET /api/v1/fees/outstanding` - Get outstanding fees

### Reports

- `GET /api/v1/reports/academic` - Academic reports
- `GET /api/v1/reports/financial` - Financial reports
- `GET /api/v1/reports/attendance` - Attendance reports

---

## Troubleshooting

### Login Issues
- Verify credentials (case-sensitive)
- Clear browser cache
- Try different browser
- Contact administrator

### Marks Not Saving
- Check internet connection
- Marks save offline automatically
- Click "Submit to Server" when online

### Payment Failed
- Verify phone number format
- Check network balance
- Try different network
- Contact support

### Report Card Not Generating
- Ensure all marks entered
- Wait 2-3 minutes for processing
- Refresh page
- Check browser console

---

## Support

For technical support and inquiries:
- Check documentation first
- Review troubleshooting guide
- Contact your system administrator
- Visit project repository for updates

---

## Technical Stack

- **Frontend:** React + TypeScript + Next.js
- **Backend:** Go + Gin + GORM
- **Database:** PostgreSQL
- **Queue:** Redis + Asynq
- **Storage:** S3-compatible (MinIO)
- **PDF Generation:** Node.js + Puppeteer

---

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting pull requests.

---

## License

[Specify your license here]

---

## Acknowledgments

Built for Ugandan schools with UNEB and NCDC compliance.

---

*For detailed setup instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)*  
*For API documentation, see [API.md](API.md)*

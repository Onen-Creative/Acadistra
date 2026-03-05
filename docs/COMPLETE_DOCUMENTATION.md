# Acadistra Complete Documentation

**Comprehensive Guide for School Management System**  
**Version 1.0 | January 2025**

---

## Table of Contents

### Part 1: Quick Start Guide
1. [First Login](#1-first-login)
2. [Basic Setup](#2-basic-setup)
3. [Add Students](#3-add-students)
4. [Add Staff](#4-add-staff)
5. [Common Tasks by Role](#5-common-tasks-by-role)

### Part 2: User Manual
6. [System Overview](#6-system-overview)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [Student Management](#8-student-management)
9. [Academic Management](#9-academic-management)
10. [Fees & Finance](#10-fees--finance)
11. [Attendance Tracking](#11-attendance-tracking)
12. [Additional Modules](#12-additional-modules)
13. [Reports & Analytics](#13-reports--analytics)

### Part 3: Role-Based Guides
14. [Admin Guide](#14-admin-guide)
15. [Teacher Guide](#15-teacher-guide)
16. [Bursar Guide](#16-bursar-guide)
17. [Librarian Guide](#17-librarian-guide)
18. [Nurse Guide](#18-nurse-guide)
19. [Parent Guide](#19-parent-guide)

### Part 4: Video Scripts
20. [Sales Demo Script](#20-sales-demo-script)
21. [Training Video Scripts](#21-training-video-scripts)

### Part 5: Reference
22. [Troubleshooting](#22-troubleshooting)
23. [FAQs](#23-faqs)
24. [Support & Contact](#24-support--contact)

---

# PART 1: QUICK START GUIDE

## 1. First Login

### Access the System
1. Open web browser (Chrome recommended)
2. Go to: **https://yourschool.acadistra.com**
3. Enter credentials provided by admin
4. Click **"Login"**

### Change Password
1. Click profile icon (top right)
2. Select **"Profile"** → **"Change Password"**
3. Enter new password (minimum 8 characters)
4. Click **"Save"**

---

## 2. Basic Setup

### Configure School Settings
1. **Settings** → **School Information**
2. Fill in: Name, Address, Phone, Email, Logo
3. **Settings** → **Academic Settings**
4. Set: Current Term, Year, Term Dates
5. Click **"Save"**

### Create Classes
1. **Classes** → **Add Class**
2. Enter: Name (P1, S1, etc.), Section, Capacity
3. Click **"Create"**
4. Repeat for all classes

---

## 3. Add Students

### Individual Registration
1. **Students** → **Register Student**
2. Fill in: Name, Admission Number, Class, DOB, Gender
3. Upload photo (optional)
4. Click **"Register"**

### Bulk Import
1. **Students** → **Import**
2. Download Excel template
3. Fill in student data
4. Upload file
5. Click **"Confirm Import"**

### Add Guardian
1. Open student profile
2. **Guardians** tab → **"Add Guardian"**
3. Fill in: Name, Relationship, Phone, Email
4. Check "Primary Contact" if applicable
5. Click **"Save"**

---

## 4. Add Staff

### Register Staff
1. **Staff** → **Register Staff**
2. Fill in: Name, ID, Role, Salary
3. Click **"Register"**

### Create User Account
1. **Users** → **Create User**
2. Enter: Email, Role
3. Link to staff member
4. Click **"Create"**
5. Credentials sent via SMS/Email

---

## 5. Common Tasks by Role

### For Teachers: Enter Marks
1. **Enter Marks**
2. Select: Class, Subject, Assessment (BOT/MOT/EOT)
3. Enter marks (0-100)
4. Click **"Save Marks"** (saves offline)
5. Click **"Submit to Server"** when online

### For Bursars: Record Payment
1. **Fees** → **Record Payment**
2. Search student
3. Enter: Amount, Payment Method, Receipt Number
4. Click **"Record"**
5. Receipt auto-generated

### For Admins: Generate Report Cards
1. **Report Cards**
2. Select: Class, Term, Year
3. Click **"Generate"**
4. Download PDFs (1-2 minutes)

### For Parents: Pay Fees
1. Login to parent portal
2. **Fees** → **"Pay Now"**
3. Enter: Amount, Phone Number, Network
4. Confirm on phone with PIN
5. Receipt sent via SMS

---

# PART 2: USER MANUAL

## 6. System Overview

### About Acadistra
Comprehensive school management system for Ugandan schools (ECCE → S6) with UNEB/NCDC compliance.

### Key Features
- Multi-section support (ECCE, Primary, Secondary)
- Offline-first marks entry
- Mobile money integration (MTN, Airtel)
- Automated report cards
- Parent portal
- Payroll & finance management
- Library & clinic modules
- Comprehensive reporting

### System Requirements
- Browser: Chrome 90+, Firefox 88+, Safari 14+
- Internet: 2 Mbps minimum
- Screen: 1366x768 minimum

### Architecture
- Frontend: React + TypeScript + Next.js
- Backend: Go + Gin + PostgreSQL
- Queue: Redis + Asynq
- Storage: S3-compatible
- Multi-tenant design

---

## 7. User Roles & Permissions

### System Admin
- Manage multiple schools
- Create school administrators
- View system-wide reports
- Access audit logs

### School Admin
- Manage students, staff, classes
- Configure school settings
- Process payroll
- View all reports
- Full system access

### Teacher
- Enter and view marks
- Mark attendance
- View assigned classes
- Generate class reports

### Bursar
- Record fees payments
- View financial reports
- Manage income/expenditure
- Generate receipts

### Librarian
- Manage books
- Issue/return books
- Track overdue books
- Generate library reports

### Nurse
- Record patient visits
- Manage health profiles
- Track medicine inventory
- Generate health reports

### Parent/Guardian
- View child's results
- View attendance
- View fees balance
- Make mobile money payments
- Receive notifications

---

## 8. Student Management

### Registration Process
**Required Fields:**
- First Name, Last Name
- Admission Number (unique)
- Date of Birth
- Gender
- Class

**Optional Fields:**
- Middle Name, Photo
- Phone, Email, Address
- Religion, Nationality
- Special Needs, Previous School

### Bulk Import
1. Download Excel template
2. Fill columns: admission_no, first_name, last_name, dob, gender, class
3. Upload file
4. Review preview
5. Confirm import

**Validation:**
- Duplicate admission numbers rejected
- Invalid dates flagged
- Missing required fields highlighted

### Student Profile
**Tabs:**
- Overview: Basic information
- Academic: Marks, report cards
- Fees: Payment history
- Attendance: Attendance records
- Health: Medical records
- Guardians: Parent information

### Guardian Management
**Add Guardian:**
1. Student profile → Guardians tab
2. Click **"Add Guardian"**
3. Fill: Name, Relationship, Phone, Email
4. Set as primary contact (optional)
5. Click **"Save"**

**Create Portal Account:**
- Click **"Create Portal Account"**
- Credentials sent via SMS/Email
- Parent can login immediately

---

## 9. Academic Management

### Class Management
**Create Class:**
- Name: P1-P7, S1-S6, ECCE levels
- Section: Primary, Secondary, ECCE
- Capacity: Maximum students
- Class Teacher: Assign teacher

**Enroll Students:**
1. Select class
2. Click **"Enroll Students"**
3. Select students from list
4. Click **"Enroll"**

### Subject Management
**Standardized Subjects:**
- Primary: English, Math, Science, SST, RE
- O-Level: English, Math, Physics, Chemistry, Biology, etc.
- A-Level: Subject combinations (HEG, PCM, BCM)

### Marks Entry
**Process:**
1. Select: Class, Subject, Assessment, Term, Year
2. Enter marks (0-100)
3. Use Tab key to navigate
4. Click **"Save Marks"** (offline storage)
5. Click **"Submit to Server"** when online

**Offline Functionality:**
- Saves in browser storage
- Works without internet
- Auto-syncs when online
- Conflict resolution

### Grading Systems
**UNEB (O-Level & A-Level):**
- D1: 75-100, D2: 65-74, C3: 60-64
- C4: 55-59, C5: 50-54, C6: 45-49
- P7: 40-44, P8: 35-39, F9: 0-34

**NCDC (Primary & ECCE):**
- Distinction: 80-100
- Credit: 60-79
- Pass: 50-59
- Fail: 0-49

### Report Cards
**Generation:**
1. Select: Class, Term, Year
2. Click **"Generate"**
3. Processing: 1-2 minutes per class
4. Download: Individual or ZIP

**Contents:**
- Student information
- Subject marks (BOT, MOT, EOT)
- Grades and aggregates
- Class position
- Teacher/Head teacher comments
- Attendance summary
- Fees balance

---

## 10. Fees & Finance

### Fees Structure
**Setup:**
1. **Settings** → **Fees Structure**
2. Add fee items: Tuition, Boarding, etc.
3. Set: Amount, Applicable Classes, Term
4. Mark as Mandatory/Optional

**Assign to Students:**
1. **Fees** → **Assign Fees**
2. Select class or individuals
3. System calculates total
4. Click **"Assign"**

### Recording Payments
**Manual Entry:**
1. **Fees** → **Record Payment**
2. Search student
3. Enter: Amount, Method, Receipt Number, Date
4. Click **"Record"**
5. Receipt auto-generated

**Payment Methods:**
- Cash, Bank Transfer, Cheque
- Mobile Money (auto-recorded)

### Mobile Money Integration
**Flow:**
1. Parent initiates from portal
2. System sends to Flutterwave
3. Parent receives phone prompt
4. Parent enters PIN
5. Payment auto-recorded
6. Receipt sent via SMS
7. Income record created

**Supported Networks:**
- MTN Mobile Money
- Airtel Money

### Finance Management
**Income:**
- Categories: Fees, Donations, Grants, Other
- Auto-recorded: Mobile money, fees payments
- View details page for each record

**Expenditure:**
- Categories: Salaries, Utilities, Supplies, Other
- Auto-recorded: Payroll, inventory purchases
- View details page for each record

**Financial Summary:**
- Total income/expenditure
- Net balance
- Category breakdown
- Term/year comparison

---

## 11. Attendance Tracking

### Daily Attendance
**Mark Attendance:**
1. **Attendance** → Select class and date
2. Mark each student:
   - ✅ Present
   - ❌ Absent
   - 🏥 Sick
   - 📝 Excused
3. Add notes (optional)
4. Click **"Save"**

**Bulk Actions:**
- Mark all present
- Mark specific students absent

### Attendance Reports
**Available Reports:**
- Daily, Weekly, Monthly, Termly
- Student-wise attendance
- Class-wise comparison
- Attendance trends

**Export:**
- Excel format
- PDF format
- Email to stakeholders

### Automatic Alerts
**Notifications:**
- SMS to parent when absent
- Email for consecutive absences
- Alert to admin for low rates

**Configuration:**
1. **Settings** → **Notifications**
2. Enable/disable alerts
3. Set thresholds
4. Save

---

## 12. Additional Modules

### Library Management
**Book Management:**
- Add books: Title, Author, ISBN, Category, Quantity
- Categories: Fiction, Non-Fiction, Reference, Textbooks
- Upload book cover (optional)

**Issuance:**
- Issue book: Search student, search book, set due date
- Return book: Scan/search, calculate fines
- Fine: UGX 500/day overdue (configurable)

**Reports:**
- Books issued/returned
- Overdue books
- Popular books
- Fine collection

### Clinic Management
**Health Profiles:**
- Blood group, allergies, chronic conditions
- Medications, emergency contact
- Doctor's contact

**Patient Visits:**
- Record: Date, symptoms, diagnosis, treatment
- Dispense medicine (auto-reduces inventory)
- Notify parent option

**Medicine Inventory:**
- Add medicine: Name, quantity, expiry date
- Auto-alerts for low stock
- Track dispensing

**Emergency Incidents:**
- Record incident type, description, action taken
- Hospital referral, parent notification

### Payroll System
**Salary Structure:**
- Basic salary, allowances, deductions
- NSSF, PAYE calculations
- Loan deductions

**Process Payroll:**
1. Select month and year
2. Review staff list
3. Add bonuses/deductions
4. Generate payroll
5. Review payslips
6. Approve & record

**Auto-Actions:**
- Expenditure records created
- Payslips generated (PDF)
- Email sent to staff
- Bank transfer file (optional)

### Inventory Management
**Item Management:**
- Add items: Name, category, quantity, price
- Set reorder levels
- Track suppliers

**Stock Management:**
- Record purchases (creates expenditure)
- Issue items to departments
- Stock alerts

---

## 13. Reports & Analytics

### Academic Reports
- Class performance analysis
- Subject-wise performance
- Student progress tracking
- Grade distribution
- Pass/fail rates

### Financial Reports
- Income statement
- Expenditure breakdown
- Fees collection analysis
- Budget vs actual
- Cash flow statement

### Operational Reports
- Attendance summary
- Staff performance
- Library usage
- Clinic visits
- Inventory status

### Custom Reports
1. **Reports** → **Custom**
2. Select data sources
3. Choose fields
4. Apply filters
5. Generate

---

# PART 3: ROLE-BASED GUIDES

## 14. Admin Guide

### Daily Tasks Checklist
- ✅ Review dashboard summary
- ✅ Check pending approvals
- ✅ Monitor attendance rates
- ✅ Review fees collection

### Quick Actions
**Add Student:** Students → Register → Fill → Save  
**Assign Teacher:** Classes → Select → Assign Teacher  
**Record Payment:** Fees → Record → Search → Enter → Save  
**Generate Reports:** Reports → Select → Filter → Generate

### Keyboard Shortcuts
- `Ctrl + S` - Save
- `Ctrl + F` - Search
- `Esc` - Close modal

---

## 15. Teacher Guide

### Daily Tasks Checklist
- ✅ Mark attendance (before 10 AM)
- ✅ Enter marks (during assessments)
- ✅ Check class schedule

### Mark Attendance
1. Attendance → Select class & date
2. Mark students (Present/Absent/Sick/Excused)
3. Save

### Enter Marks
1. Enter Marks → Select class, subject, assessment
2. Enter marks (use Tab to navigate)
3. Save (offline storage)
4. Submit to Server (when online)

### Tips
- Marks save offline automatically
- Submit when online
- Double-check before submitting
- Meet admin deadlines

---

## 16. Bursar Guide

### Daily Tasks Checklist
- ✅ Record fees payments
- ✅ Generate receipts
- ✅ Check outstanding fees
- ✅ Reconcile mobile money

### Record Payment
1. Fees → Record Payment
2. Search student
3. Enter: Amount, Method, Receipt Number
4. Save (receipt auto-generated)

### View Outstanding
Fees → Outstanding → Filter by class → Export

### Generate Report
Reports → Financial → Select period → Generate → Download

### Payment Methods
- Cash, Bank Transfer, Cheque
- Mobile Money (auto-recorded)

---

## 17. Librarian Guide

### Daily Tasks Checklist
- ✅ Issue books
- ✅ Process returns
- ✅ Check overdue books
- ✅ Update inventory

### Issue Book
Library → Issue → Search student → Search book → Set due date → Issue

### Return Book
Library → Returns → Scan/search → Check fines → Return

### Add Book
Library → Books → Add → Fill details → Save

### Fine Calculation
Default: UGX 500/day overdue (auto-calculated)

---

## 18. Nurse Guide

### Daily Tasks Checklist
- ✅ Record patient visits
- ✅ Dispense medicine
- ✅ Check medicine stock
- ✅ Update health profiles

### Record Visit
1. Clinic → New Visit → Search student
2. Enter: Symptoms, Diagnosis, Treatment, Medicine
3. Save (parent notified automatically)

### Update Health Profile
Clinic → Health Profiles → Search → Update allergies, conditions → Save

### Manage Medicine
Clinic → Medicines → Add/Update stock → Set expiry alerts

### Record Emergency
Clinic → Emergencies → Record incident → Notify parent

---

## 19. Parent Guide

### What You Can Do
- ✅ View child's results
- ✅ Check attendance
- ✅ View fees balance
- ✅ Pay fees via mobile money
- ✅ View health records
- ✅ Receive notifications

### View Results
Login → Select child → Results → Choose term → View/Download

### Pay Fees
1. Fees → Pay Now
2. Enter: Amount, Phone Number, Network
3. Receive prompt on phone
4. Enter PIN to confirm
5. Receipt sent via SMS

### Check Attendance
Attendance → View records

### Update Contact
Settings → Update phone/email → Save

### Notifications Received
- Student absence
- Fees payment confirmation
- Report card ready
- Health incidents

---

# PART 4: VIDEO SCRIPTS

## 20. Sales Demo Script

**Duration:** 10 minutes  
**Target:** School administrators, decision-makers

### [0:00-0:30] Introduction
"Welcome to Acadistra - Uganda's most comprehensive school management system. Built for ECCE to S6 with full UNEB/NCDC compliance. In 10 minutes, I'll show you how Acadistra transforms school operations."

### [0:30-2:00] Student Management
"Register students in seconds or import hundreds at once. Each student has a complete profile with academic records, fees, attendance, and health - all in one place."

### [2:00-3:30] Marks & Report Cards
"Teachers enter marks offline - no internet needed. When it's time for report cards, click one button. Professional UNEB-compliant reports generated in minutes."

### [3:30-5:00] Fees & Mobile Money
"Track every shilling. Parents pay fees via MTN or Airtel Money from their phones. Payment automatically recorded. Receipt sent via SMS. No manual entry."

### [5:00-6:30] Attendance & Notifications
"Teachers mark attendance daily. When student is absent, parent receives SMS immediately. This feature reduces absenteeism by 30%."

### [6:30-7:30] Payroll & Finance
"Process monthly payroll with one click. Generates payslips, calculates PAYE/NSSF, records expenditure automatically. Complete financial overview included."

### [7:30-8:30] Library & Clinic
"Track books, issue to students, calculate fines automatically. Record clinic visits, track medicine, notify parents. Everything connected."

### [8:30-9:30] Reports & Parent Portal
"Comprehensive reports at the click of a button. Parents get their own portal - view results, check attendance, pay fees. All from their phone."

### [9:30-10:00] Closing
"With Acadistra you get complete management, offline capability, mobile money, automated notifications, payroll, and comprehensive reports. All UNEB/NCDC compliant. Contact us: WhatsApp +256-XXX-XXXXXX, sales@acadistra.com"

---

## 21. Training Video Scripts

### Teacher Training (8 minutes)

**[0:00-1:30] Login & Setup**
"Open browser, go to school URL, enter credentials, login. Change password: Profile → Change Password → Save."

**[1:30-4:00] Mark Attendance**
"Attendance → Select class → Mark Present/Absent/Sick/Excused → Save. Parent receives SMS if absent."

**[4:00-7:30] Enter Marks**
"Enter Marks → Select class, subject, assessment → Enter marks (0-100) → Save (offline) → Submit to Server (online). Works without internet!"

**[7:30-8:00] Tips**
"Mark attendance before 10 AM. Save marks frequently. Submit when online. Meet deadlines."

### Parent Portal Guide (5 minutes)

**[0:00-1:30] Login & Navigation**
"Open browser → Enter school URL → Login with credentials → View dashboard with children."

**[1:30-2:30] View Results**
"Click child → Results → Select term → View report card → Download PDF."

**[2:30-3:30] Check Attendance**
"Attendance → View records → Green = present, Red = absent."

**[3:30-4:30] Pay Fees**
"Fees → Pay Now → Enter amount, phone, network → Confirm on phone → Receipt via SMS."

**[4:30-5:00] Summary**
"View results, check attendance, pay fees - all from your phone, anytime."

### Admin Quick Start (6 minutes)

**[0:00-1:30] School Settings**
"Settings → School Information → Fill details → Academic Settings → Set term, year, dates → Save."

**[1:30-2:30] Create Classes**
"Classes → Add Class → Enter name, section, capacity → Create. Repeat for all classes."

**[2:30-4:00] Register Students**
"Individual: Students → Register → Fill → Save. Bulk: Import → Download template → Fill → Upload → Confirm."

**[4:00-5:30] Add Staff**
"Staff → Register → Fill details → Save. Users → Create User → Enter email, role, link staff → Create."

**[5:30-6:00] Next Steps**
"Assign teachers, configure fees, train staff, start using!"

---

# PART 5: REFERENCE

## 22. Troubleshooting

### Login Issues
**Problem:** Can't login  
**Solution:**
- Check username/password (case-sensitive)
- Clear browser cache
- Try different browser
- Contact admin for password reset

### Marks Not Saving
**Problem:** Marks disappear  
**Solution:**
- Check internet connection
- Marks save offline automatically
- Click "Submit to Server" when online
- Check browser console for errors

### Payment Failed
**Problem:** Mobile money payment fails  
**Solution:**
- Verify phone number format (+256XXXXXXXXX)
- Check network balance
- Try different network
- Contact support if persists

### Report Card Not Generating
**Problem:** Report cards don't generate  
**Solution:**
- Ensure all marks entered
- Check term/year selection
- Wait 2-3 minutes for processing
- Refresh page
- Check browser console

### SMS Not Sending
**Problem:** Notifications not received  
**Solution:**
- Verify phone number format
- Check SMS credits balance
- Verify API configuration
- Check notification logs

### Email Not Delivering
**Problem:** Emails not received  
**Solution:**
- Check spam folder
- Verify SMTP credentials
- Test with different email
- Check email bounce rate

---

## 23. FAQs

**Q: Can I use Acadistra offline?**  
A: Yes, marks entry works offline. Data syncs when connection restored.

**Q: How secure is student data?**  
A: Data is encrypted, access is role-based, audit logs track all actions.

**Q: Can parents pay fees via mobile money?**  
A: Yes, MTN and Airtel Money supported.

**Q: How long does report card generation take?**  
A: 1-2 minutes per class, depending on size.

**Q: Can I customize the grading system?**  
A: Yes, contact support for custom configurations.

**Q: Is training provided?**  
A: Yes, free 2-hour onboarding training included.

**Q: What if I forget my password?**  
A: Click "Forgot Password" on login or contact admin.

**Q: Can I export data?**  
A: Yes, most reports export to Excel/PDF.

**Q: Does it work on mobile phones?**  
A: Yes, fully responsive design works on all devices.

**Q: What happens to data if internet goes down?**  
A: Marks save locally, sync when online. System designed for offline use.

**Q: Can multiple teachers enter marks simultaneously?**  
A: Yes, system handles concurrent entries with conflict resolution.

**Q: How often is data backed up?**  
A: Daily automatic backups with 30-day retention.

---

## 24. Support & Contact

### Support Channels
- **WhatsApp:** +256-XXX-XXXXXX (9 AM - 6 PM EAT)
- **Email:** support@acadistra.com
- **Phone:** +256-XXX-XXXXXX
- **Website:** www.acadistra.com

### Response Times
- Critical issues: 2 hours
- General queries: 24 hours
- Feature requests: 1 week

### Office Hours
- Monday - Friday: 8:00 AM - 6:00 PM EAT
- Saturday: 9:00 AM - 1:00 PM EAT
- Sunday: Closed

### Training & Resources
- Free onboarding training (2 hours)
- Video tutorials: youtube.com/acadistra
- Documentation: acadistra.com/docs
- Community forum: forum.acadistra.com

### Sales Inquiries
- **Email:** sales@acadistra.com
- **WhatsApp:** +256-XXX-XXXXXX
- **Website:** www.acadistra.com/pricing

### Technical Support
- Check logs: Backend logs directory
- Database access: Contact support
- API documentation: acadistra.com/api-docs
- Test webhook: webhook.site

### Glossary
- **BOT:** Beginning of Term
- **MOT:** Middle of Term
- **EOT:** End of Term
- **UNEB:** Uganda National Examinations Board
- **NCDC:** National Curriculum Development Centre
- **ECCE:** Early Childhood Care and Education

### Keyboard Shortcuts
- `Ctrl + S` - Save
- `Ctrl + F` - Search
- `Esc` - Close modal
- `Tab` - Navigate fields
- `Ctrl + P` - Print

---

**End of Documentation**

*Document Version: 1.0*  
*Last Updated: January 2025*  
*© 2025 Acadistra. All rights reserved.*

**For the latest updates, visit:** www.acadistra.com/docs

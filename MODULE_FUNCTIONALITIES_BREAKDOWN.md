# Module-Based System - Complete Functionality Breakdown

## Overview

The system is divided into **8 independent modules**. Schools select which modules they need during registration, and users only see functionalities for activated modules.

---

## 📚 Module 1: ACADEMIC MANAGEMENT
**Code:** `academic`  
**Description:** Core academic operations - student enrollment, classes, marks, grading, and reporting

### Features Included:

#### Student Management
- **Student Registration** - Enroll new students with personal details, photos, guardians
- **Student Profiles** - View/edit student information, academic history
- **Student List** - Search, filter, export student data
- **Student Promotion/Demotion** - Move students between classes
- **Student Status Management** - Active, suspended, graduated, transferred, withdrawn
- **Bulk Student Import** - Import students via Excel/CSV

#### Class Management
- **Class Creation** - Create classes by level (P1-P7, S1-S6, ECCE)
- **Class Streams** - Manage multiple streams per level (e.g., P5A, P5B)
- **Class Capacity** - Set maximum students per class
- **Class Teacher Assignment** - Assign class teachers
- **Class Lists** - View students enrolled in each class

#### Marks & Assessment
- **Marks Entry** - Enter BOT, MOT, EOT marks
- **Continuous Assessment** - Record CA marks (0-40)
- **Exam Marks** - Record exam marks (0-60)
- **Integration Activities** - Track 5 activities per subject (S1-S4)
- **Advanced Level Papers** - Support for Paper 1, 2, 3 (A-Level)
- **Bulk Marks Import** - Import marks via Excel templates
- **Marks Approval Workflow** - School admin approves imported marks
- **Offline Marks Entry** - Enter marks offline, sync when online

#### Grading & Results
- **UNEB Grading** - Automatic grading for O-Level (S1-S4) and A-Level (S5-S6)
- **NCDC Grading** - Automatic grading for Primary (P1-P7) and ECCE
- **Subject Results** - Calculate final grades per subject
- **Overall Performance** - Calculate aggregates, divisions, grades
- **Grade Recalculation** - Recalculate grades when rules change
- **Results Publishing** - Publish/unpublish results per term

#### Report Cards
- **PDF Report Generation** - Generate individual student report cards
- **Bulk Report Generation** - Generate reports for entire class
- **Report Card Templates** - UNEB/NCDC compliant templates
- **Report Card Download** - Download as PDF
- **Report Card History** - View past term reports

#### Attendance
- **Daily Attendance** - Mark present, absent, late, sick, excused
- **Bulk Attendance** - Mark entire class at once
- **Attendance Reports** - View attendance rates, trends
- **Attendance Alerts** - Flag students with poor attendance
- **Holiday Management** - Define school holidays, non-school days
- **Term Dates** - Set term start/end dates

#### Lesson Monitoring
- **Lesson Plans** - Teachers submit lesson plans
- **Lesson Observation** - DOS/Admin observe and rate lessons
- **Lesson Reports** - Track lesson completion rates
- **Teacher Performance** - Monitor teaching quality

#### Performance Analytics
- **Class Performance** - Compare class averages
- **Subject Performance** - Identify strong/weak subjects
- **Student Trends** - Track individual student progress
- **Top Performers** - Identify top students
- **At-Risk Students** - Flag struggling students
- **Performance Graphs** - Visual charts and trends

#### Subjects
- **Standard Subjects** - Pre-defined curriculum subjects per level
- **Subject Assignment** - Assign subjects to classes
- **Compulsory Subjects** - Mark subjects as compulsory
- **Subject Papers** - Support multi-paper subjects

### API Routes Protected:
```
/students/*
/classes/*
/marks/*
/results/*
/report-cards/*
/attendance/*
/lessons/*
/analytics/*
/subjects/*
```

### Menu Items Shown:
- Students
- Classes
- Enter Marks
- View Marks
- Results
- Report Cards
- Attendance
- Lesson Monitoring
- Performance Analytics

---

## 💰 Module 2: FINANCE MANAGEMENT
**Code:** `finance`  
**Description:** Financial operations - fees, payments, income, expenditure, budgeting

### Features Included:

#### Fee Management
- **Fee Structure Setup** - Define fees per level/term
- **Fee Types** - Tuition, uniform, medical, transport, etc.
- **Fee Breakdown** - Itemized fee components
- **Student Fee Assignment** - Assign fees to students
- **Fee Waivers** - Grant partial/full fee waivers
- **Fee Arrears Tracking** - Track outstanding balances

#### Payment Processing
- **Manual Payment Recording** - Record cash/bank payments
- **Payment Receipts** - Generate payment receipts
- **Payment History** - View all payments per student
- **Payment Breakdown** - Allocate payments to fee types
- **Bulk Payment Import** - Import payments via Excel

#### Mobile Money Integration
- **SchoolPay Integration** - Real-time mobile money payments
- **MTN Mobile Money** - Accept MTN payments
- **Airtel Money** - Accept Airtel payments
- **Payment Notifications** - SMS/email payment confirmations
- **Payment Reconciliation** - Match payments to students
- **Transaction Logs** - Track all mobile money transactions

#### Income Tracking
- **Income Categories** - Fees, donations, grants, fundraising
- **Income Recording** - Record all income sources
- **Receipt Generation** - Generate income receipts
- **Income Reports** - View income by category, period

#### Expenditure Tracking
- **Expense Categories** - Salaries, utilities, supplies, maintenance
- **Expense Recording** - Record all expenses
- **Vendor Management** - Track vendors/suppliers
- **Invoice Management** - Attach invoices to expenses
- **Approval Workflow** - Approve expenses before payment

#### Budget Management
- **Budget Planning** - Create annual/term budgets
- **Budget Categories** - Allocate budget by category
- **Budget vs Actual** - Compare planned vs actual spending
- **Budget Alerts** - Warn when approaching limits
- **Budget Reports** - View budget utilization

#### Requisitions
- **Purchase Requests** - Staff submit purchase requests
- **Approval Workflow** - Multi-level approval process
- **Requisition Tracking** - Track request status
- **Requisition History** - View all past requests
- **Budget Integration** - Check budget availability

#### Financial Reports
- **Income Statement** - Revenue and expenses
- **Balance Sheet** - Assets and liabilities
- **Cash Flow** - Cash in/out tracking
- **Fee Collection Report** - Collection rates by class
- **Defaulters Report** - Students with arrears
- **Payment Trends** - Payment patterns over time

### API Routes Protected:
```
/fees/*
/finance/*
/finance/budget/*
/finance/requisitions/*
/finance/schoolpay/*
```

### Menu Items Shown:
- Fee Management
- Finance
- Budget
- Requisitions
- SchoolPay
- Financial Reports

---

## 👥 Module 3: HR & PAYROLL
**Code:** `hr`  
**Description:** Staff management, payroll processing, salary structures

### Features Included:

#### Staff Management
- **Staff Registration** - Add new staff with details, photos
- **Staff Profiles** - View/edit staff information
- **Staff List** - Search, filter, export staff data
- **Employee ID Generation** - Auto-generate unique IDs
- **Staff Roles** - Teacher, Admin, Bursar, Librarian, Nurse, etc.
- **Staff Status** - Active, on leave, suspended, terminated
- **Staff Documents** - Upload contracts, certificates, IDs

#### Salary Structures
- **Salary Setup** - Define base salary per role
- **Allowances** - Housing, transport, medical allowances
- **Deductions** - PAYE, NSSF, loans, advances
- **Salary Grades** - Different pay scales
- **Salary History** - Track salary changes over time

#### Payroll Processing
- **Monthly Payroll** - Process monthly salaries
- **Payroll Calculation** - Auto-calculate gross, net, deductions
- **Payslip Generation** - Generate PDF payslips
- **Payroll Reports** - Summary by department, role
- **Payment Tracking** - Mark salaries as paid
- **Payroll History** - View past payroll runs
- **Finance Integration** - Auto-create expenditure records

#### Leave Management
- **Leave Requests** - Staff submit leave requests
- **Leave Types** - Annual, sick, maternity, study leave
- **Leave Approval** - Approve/reject leave requests
- **Leave Balance** - Track remaining leave days
- **Leave Calendar** - View who's on leave

#### Staff Attendance
- **Daily Attendance** - Mark staff present/absent
- **Late Arrivals** - Track tardiness
- **Attendance Reports** - Staff attendance rates
- **Attendance Alerts** - Flag poor attendance

#### Performance Management
- **Performance Reviews** - Conduct staff appraisals
- **Performance Ratings** - Rate staff performance
- **Performance History** - Track performance over time
- **Training Needs** - Identify training requirements

### API Routes Protected:
```
/staff/*
/payroll/*
```

### Menu Items Shown:
- Staff
- Payroll
- Staff Reports

---

## 📖 Module 4: LIBRARY MANAGEMENT
**Code:** `library`  
**Description:** Book cataloging, issuing, returns, fines

### Features Included:

#### Book Management
- **Book Cataloging** - Add books with ISBN, title, author
- **Book Categories** - Fiction, non-fiction, textbooks, reference
- **Book Subjects** - Categorize by subject
- **Book Levels** - Assign to class levels
- **Copy Tracking** - Track multiple copies per book
- **Book Status** - Available, issued, lost, damaged
- **Book Search** - Search by title, author, ISBN, category

#### Book Issuing
- **Issue Books** - Issue books to students/teachers
- **Bulk Issue** - Issue multiple books at once
- **Due Date Tracking** - Set return due dates
- **Issue History** - View borrowing history
- **Copy Number Tracking** - Track which copy is issued

#### Book Returns
- **Return Processing** - Process book returns
- **Bulk Returns** - Return multiple books at once
- **Late Returns** - Flag overdue books
- **Damaged Books** - Mark books as damaged on return
- **Lost Books** - Mark books as lost

#### Fines Management
- **Fine Calculation** - Auto-calculate late fees
- **Fine Collection** - Record fine payments
- **Fine Waivers** - Waive fines when appropriate
- **Fine Reports** - Track fine collection

#### Library Reports
- **Issued Books Report** - Currently issued books
- **Overdue Books Report** - Books past due date
- **Popular Books Report** - Most borrowed books
- **Borrower Report** - Top borrowers
- **Book Inventory Report** - Stock levels
- **Lost/Damaged Report** - Books needing replacement

#### Requisitions
- **Book Requisitions** - Request new books
- **Approval Workflow** - Approve book purchases
- **Budget Integration** - Check library budget

### API Routes Protected:
```
/library/*
/library/books/*
/library/issues/*
/library/reports/*
```

### Menu Items Shown:
- Library Dashboard
- Books
- Book Issues
- Library Reports

---

## 🏥 Module 5: CLINIC MANAGEMENT
**Code:** `clinic`  
**Description:** Health records, clinic visits, medicines, emergencies

### Features Included:

#### Health Profiles
- **Student Health Records** - Comprehensive health information
- **Blood Group** - Record blood type
- **Allergies** - Track allergies
- **Chronic Conditions** - Record ongoing conditions
- **Disabilities** - Document special needs
- **Vaccination History** - Track immunizations
- **Emergency Contacts** - Parent/guardian emergency numbers

#### Clinic Visits
- **Visit Recording** - Record each clinic visit
- **Symptoms** - Document presenting symptoms
- **Assessment** - Nurse's assessment
- **Diagnosis** - Record diagnosis
- **Treatment** - Document treatment given
- **Vital Signs** - Temperature, BP, pulse, weight, height
- **Outcome** - Sent to class, sent home, referred
- **Follow-up** - Schedule follow-up visits
- **Parent Notification** - Notify parents of visit

#### Medicine Inventory
- **Medicine Cataloging** - Add medicines with details
- **Medicine Categories** - Antibiotics, painkillers, etc.
- **Dosage Forms** - Tablets, syrup, injection
- **Stock Tracking** - Track quantity, expiry dates
- **Batch Numbers** - Track medicine batches
- **Minimum Stock Alerts** - Alert when stock low
- **Supplier Management** - Track medicine suppliers

#### Medicine Administration
- **Medication Records** - Track medicine given to students
- **Dosage Tracking** - Record dose and frequency
- **Stock Deduction** - Auto-deduct from inventory
- **Administration History** - View past medications

#### Medical Tests
- **Test Recording** - Record tests performed
- **Test Types** - Malaria, HIV, pregnancy, etc.
- **Test Results** - Document results
- **Sensitive Tests** - Flag confidential tests
- **Consent Tracking** - Record parental consent
- **Follow-up Actions** - Document next steps

#### Consumables
- **Consumable Inventory** - Bandages, gloves, syringes, etc.
- **Usage Tracking** - Track consumable usage
- **Stock Management** - Monitor stock levels
- **Requisitions** - Request new supplies

#### Emergency Incidents
- **Incident Recording** - Document serious incidents
- **Incident Types** - Accident, seizure, allergic reaction, etc.
- **Action Taken** - Document emergency response
- **Hospital Referrals** - Track referrals to hospital
- **Parent Notification** - Record when parents notified
- **Incident Reports** - Generate incident reports

#### Health Reports
- **Clinic Visit Statistics** - Visit trends
- **Common Ailments** - Most frequent conditions
- **Medicine Usage** - Medicine consumption rates
- **Emergency Incidents** - Incident frequency
- **Health Trends** - Seasonal patterns

### API Routes Protected:
```
/clinic/*
/clinic/visits/*
/clinic/health-profiles/*
/clinic/medicines/*
/clinic/emergencies/*
/clinic/reports/*
```

### Menu Items Shown:
- Clinic Dashboard
- Patient Visits
- Health Profiles
- Medicine Inventory
- Emergency Incidents
- Health Reports

---

## 📦 Module 6: INVENTORY MANAGEMENT
**Code:** `inventory`  
**Description:** Stock tracking, requisitions, suppliers

### Features Included:

#### Item Management
- **Item Cataloging** - Add inventory items
- **Item Categories** - Stationery, equipment, furniture, etc.
- **Item Details** - Name, description, unit, cost
- **Stock Tracking** - Track quantity in/out
- **Minimum Stock Levels** - Set reorder points
- **Stock Alerts** - Alert when stock low

#### Stock Movements
- **Stock In** - Record new stock received
- **Stock Out** - Record stock issued
- **Stock Adjustments** - Correct stock discrepancies
- **Stock Transfer** - Move stock between locations
- **Stock History** - View all movements

#### Supplier Management
- **Supplier Database** - Maintain supplier list
- **Supplier Contacts** - Phone, email, address
- **Supplier Performance** - Rate suppliers
- **Purchase Orders** - Create POs for suppliers

#### Requisitions
- **Item Requests** - Staff request items
- **Approval Workflow** - Approve/reject requests
- **Request Tracking** - Track request status
- **Request History** - View past requests
- **Stock Availability** - Check if items in stock

#### Inventory Reports
- **Stock Levels Report** - Current stock by item
- **Low Stock Report** - Items below minimum
- **Stock Movement Report** - In/out transactions
- **Requisition Report** - Request statistics
- **Supplier Report** - Purchases by supplier
- **Stock Valuation** - Total inventory value

### API Routes Protected:
```
/inventory/*
/storekeeper/*
```

### Menu Items Shown:
- Inventory Dashboard
- Inventory Items
- Stock Movements
- Requisitions

---

## 📱 Module 7: SMS NOTIFICATIONS
**Code:** `sms`  
**Description:** Send SMS for fees, attendance, results, announcements

### Features Included:

#### SMS Sending
- **Single SMS** - Send to one recipient
- **Bulk SMS** - Send to multiple recipients
- **Group SMS** - Send to class, level, all parents
- **Scheduled SMS** - Schedule for later sending
- **SMS Templates** - Pre-defined message templates

#### SMS Types
- **Fee Reminders** - Remind parents about fees
- **Payment Confirmations** - Confirm fee payments
- **Attendance Alerts** - Notify parents of absences
- **Results Notifications** - Notify when results ready
- **Announcements** - General school announcements
- **Emergency Alerts** - Urgent notifications

#### SMS Providers
- **Africa's Talking** - Integration with Africa's Talking
- **Twilio** - Integration with Twilio
- **Provider Configuration** - Set API credentials
- **Provider Selection** - Choose active provider

#### SMS Templates
- **Template Creation** - Create reusable templates
- **Template Variables** - {student_name}, {amount}, etc.
- **Template Categories** - Fees, attendance, results
- **Template Management** - Edit/delete templates

#### SMS Logs
- **Sent Messages** - View all sent SMS
- **Delivery Status** - Pending, sent, failed, delivered
- **Failed Messages** - View failed SMS with reasons
- **Retry Failed** - Resend failed messages
- **SMS History** - Search past messages

#### SMS Reports
- **SMS Statistics** - Total sent, delivered, failed
- **Cost Tracking** - SMS costs per month
- **Usage by Type** - Breakdown by SMS type
- **Delivery Rates** - Success/failure rates

#### SMS Queue
- **Queue Management** - View pending SMS
- **Batch Processing** - Process SMS in batches
- **Queue Priority** - Prioritize urgent messages

### API Routes Protected:
```
/sms/*
```

### Menu Items Shown:
- SMS Management
- Send SMS
- SMS Templates
- SMS Logs
- SMS Statistics

---

## 👨‍👩‍👧 Module 8: PARENT PORTAL
**Code:** `parent_portal`  
**Description:** Parent access to student progress, fees, attendance

### Features Included:

#### Parent Dashboard
- **Children Overview** - View all children at school
- **Quick Stats** - Attendance rate, fee balance, latest results
- **Recent Activity** - Latest updates for children
- **Notifications** - Important alerts

#### Student Progress
- **View Results** - See child's marks and grades
- **Report Cards** - Download report cards
- **Subject Performance** - View performance per subject
- **Progress Trends** - Track improvement over time
- **Class Ranking** - See child's position in class

#### Attendance Tracking
- **Daily Attendance** - View attendance records
- **Attendance Rate** - Overall attendance percentage
- **Absence History** - View past absences
- **Late Arrivals** - Track tardiness

#### Fee Management
- **Fee Balance** - View outstanding fees
- **Fee Breakdown** - See itemized fees
- **Payment History** - View all payments made
- **Payment Receipts** - Download receipts
- **Mobile Money Payment** - Pay fees via mobile money

#### Health Information
- **Health Profile** - View child's health records
- **Clinic Visits** - See recent clinic visits
- **Medications** - View medicines administered
- **Allergies** - View documented allergies

#### Communication
- **Announcements** - View school announcements
- **SMS Notifications** - Receive SMS alerts
- **Email Notifications** - Receive email updates

#### Settings
- **Profile Management** - Update contact information
- **Notification Preferences** - Choose what to receive
- **Password Change** - Update password
- **Multiple Children** - Manage multiple children

### API Routes Protected:
```
/parent/*
```

### Menu Items Shown:
- Parent Dashboard
- Attendance
- Results
- Fees
- Health
- Settings

---

## 🔒 Access Control Summary

### System Admin
- **Sees:** All modules (no filtering)
- **Can:** Manage schools, users, modules, system settings

### School Admin
- **Sees:** Only activated modules for their school
- **Can:** Manage all school operations within activated modules

### Teachers
- **Sees:** Academic module features (if activated)
- **Can:** Enter marks, take attendance, view students

### Bursar
- **Sees:** Finance and HR modules (if activated)
- **Can:** Manage fees, payments, payroll

### Librarian
- **Sees:** Library module (if activated)
- **Can:** Manage books, issues, returns

### Nurse
- **Sees:** Clinic module (if activated)
- **Can:** Record visits, manage medicines, track health

### Storekeeper
- **Sees:** Inventory module (if activated)
- **Can:** Manage stock, process requisitions

### Parent
- **Sees:** Parent Portal module (if activated)
- **Can:** View child's progress, pay fees, check attendance

---

## 📊 Module Dependencies

Some modules work better together:

- **Academic + Finance** - Track student fees alongside academic records
- **Academic + SMS** - Send results notifications
- **Finance + SMS** - Send fee reminders
- **HR + Finance** - Payroll creates expenditure records
- **Clinic + Parent Portal** - Parents see health information
- **All Modules + SMS** - Enhanced communication

---

## 💡 Recommended Packages

### Small Primary School
- Academic
- Finance
- **Cost:** Your pricing

### Medium Secondary School
- Academic
- Finance
- HR
- Library
- SMS
- **Cost:** Your pricing

### Large Comprehensive School
- All 8 modules
- **Cost:** Your pricing

### Specialized Packages
- **Academic Only** - Just student management and grading
- **Academic + Finance** - Core school operations
- **Full Package** - All modules for complete management

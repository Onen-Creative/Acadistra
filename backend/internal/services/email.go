package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type EmailService struct {
	host     string
	port     int
	username string
	password string
	from     string
	db       *gorm.DB
}

func NewEmailService(host string, port int, username, password, from string, db *gorm.DB) *EmailService {
	return &EmailService{
		host:     host,
		port:     port,
		username: username,
		password: password,
		from:     from,
		db:       db,
	}
}

type EmailRequest struct {
	To      []string
	Subject string
	Body    string
	IsHTML  bool
}

func (e *EmailService) SendEmail(req EmailRequest) error {
	auth := smtp.PlainAuth("", e.username, e.password, e.host)

	contentType := "text/plain"
	if req.IsHTML {
		contentType = "text/html"
	}

	msg := []byte(fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: %s; charset=UTF-8\r\n\r\n%s\r\n",
		e.from, req.To[0], req.Subject, contentType, req.Body))

	addr := fmt.Sprintf("%s:%d", e.host, e.port)
	return smtp.SendMail(addr, auth, e.from, req.To, msg)
}

// QueueEmail adds email to queue for reliable delivery
func (e *EmailService) QueueEmail(to, subject, body, emailType string, schoolID *uuid.UUID, priority int) error {
	if e.db == nil {
		// Fallback to direct send if no DB
		return e.SendEmail(EmailRequest{
			To:      []string{to},
			Subject: subject,
			Body:    body,
			IsHTML:  true,
		})
	}
	
	now := time.Now()
	queue := models.EmailQueue{
		SchoolID:    schoolID,
		To:          to,
		Subject:     subject,
		Body:        body,
		EmailType:   emailType,
		Status:      "pending",
		Priority:    priority,
		Attempts:    0,
		MaxAttempts: 3,
		NextRetry:   &now,
	}
	
	return e.db.Create(&queue).Error
}

// SendQueuedEmail sends email and updates queue status
func (e *EmailService) SendQueuedEmail(queueItem *models.EmailQueue) error {
	err := e.SendEmail(EmailRequest{
		To:      []string{queueItem.To},
		Subject: queueItem.Subject,
		Body:    queueItem.Body,
		IsHTML:  true,
	})
	
	now := time.Now()
	queueItem.Attempts++
	queueItem.LastAttempt = &now
	
	if err != nil {
		queueItem.Error = err.Error()
		
		if queueItem.Attempts >= queueItem.MaxAttempts {
			queueItem.Status = "failed"
		} else {
			// Exponential backoff: 5min, 15min, 30min
			retryDelay := time.Duration(queueItem.Attempts*queueItem.Attempts*5) * time.Minute
			nextRetry := now.Add(retryDelay)
			queueItem.NextRetry = &nextRetry
		}
	} else {
		queueItem.Status = "sent"
		queueItem.SentAt = &now
		queueItem.Error = ""
	}
	
	if e.db != nil {
		e.db.Save(queueItem)
	}
	
	return err
}

// ProcessEmailQueue processes pending emails in queue
func (e *EmailService) ProcessEmailQueue() {
	if e.db == nil {
		return
	}
	
	for {
		var emails []models.EmailQueue
		now := time.Now()
		
		// Get pending emails ready for retry
		e.db.Where("status = ? AND (next_retry IS NULL OR next_retry <= ?) AND attempts < max_attempts", "pending", now).
			Order("priority ASC, created_at ASC").
			Limit(10).
			Find(&emails)
		
		for _, email := range emails {
			if err := e.SendQueuedEmail(&email); err != nil {
				log.Printf("Failed to send queued email to %s (attempt %d/%d): %v", 
					email.To, email.Attempts, email.MaxAttempts, err)
			} else {
				log.Printf("Successfully sent queued email to %s (type: %s)", email.To, email.EmailType)
			}
		}
		
		// Sleep for 1 minute before next batch
		time.Sleep(1 * time.Minute)
	}
}

// GetQueueStats returns email queue statistics
func (e *EmailService) GetQueueStats() (*models.EmailQueueStats, error) {
	if e.db == nil {
		return nil, fmt.Errorf("database not available")
	}
	
	stats := &models.EmailQueueStats{}
	
	e.db.Model(&models.EmailQueue{}).Where("status = ?", "pending").Count(&stats.TotalPending)
	e.db.Model(&models.EmailQueue{}).Where("status = ?", "sent").Count(&stats.TotalSent)
	e.db.Model(&models.EmailQueue{}).Where("status = ?", "failed").Count(&stats.TotalFailed)
	
	// Get recent failures
	e.db.Where("status = ?", "failed").
		Order("updated_at DESC").
		Limit(10).
		Find(&stats.RecentFailures)
	
	return stats, nil
}

func (e *EmailService) SendFeesInvoice(to, studentName string, amount, paid, balance float64, term, year string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif}.invoice{max-width:600px;margin:0 auto;padding:20px}.header{background:#4F46E5;color:white;padding:20px;text-align:center}.row{display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #eee}.total{font-weight:bold;font-size:18px}</style></head>
<body>
<div class="invoice">
<div class="header"><h1>Fees Invoice</h1></div>
<p>Dear Parent,</p>
<p>Fees statement for <strong>{{.StudentName}}</strong> for {{.Term}} {{.Year}}.</p>
<div class="row"><span>Total Fees:</span><span>UGX {{.Amount}}</span></div>
<div class="row"><span>Amount Paid:</span><span>UGX {{.Paid}}</span></div>
<div class="row total"><span>Balance:</span><span>UGX {{.Balance}}</span></div>
<p>Please clear the balance at your earliest convenience.</p>
</div>
</body>
</html>`

	t, _ := template.New("invoice").Parse(tmpl)
	var body bytes.Buffer
	t.Execute(&body, map[string]interface{}{
		"StudentName": studentName,
		"Amount":      amount,
		"Paid":        paid,
		"Balance":     balance,
		"Term":        term,
		"Year":        year,
	})

	return e.QueueEmail(to, fmt.Sprintf("Fees Invoice - %s %s", term, year), body.String(), "fees_invoice", nil, 3)
}

func (e *EmailService) SendResultsNotification(to, studentName, term, year string) error {
	body := fmt.Sprintf("Dear Parent,\n\n%s's results for %s %s are now available.\n\nLogin to view: https://yourschool.com/parent\n\nBest regards,\nSchool Administration", studentName, term, year)
	return e.QueueEmail(to, fmt.Sprintf("Results Available - %s %s", term, year), body, "results_notification", nil, 4)
}

// Password Reset Email
func (e *EmailService) SendPasswordResetEmail(to, userName, resetLink string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#4F46E5;color:white;padding:20px;text-align:center;border-radius:5px 5px 0 0}.content{background:#f9f9f9;padding:20px;border:1px solid #ddd}.button{display:inline-block;background:#4F46E5;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head>
<body>
<div class="container">
<div class="header"><h1>Password Reset Request</h1></div>
<div class="content">
<p>Hello {{.UserName}},</p>
<p>We received a request to reset your password. Click the button below to create a new password:</p>
<a href="{{.ResetLink}}" class="button">Reset Password</a>
<p>This link will expire in 24 hours.</p>
<p>If you didn't request this, please ignore this email.</p>
<p>Best regards,<br>Acadistra System</p>
</div>
<div class="footer"><p>&copy; 2024 Acadistra. All rights reserved.</p></div>
</div>
</body>
</html>`

	t, _ := template.New("passwordReset").Parse(tmpl)
	var body bytes.Buffer
	t.Execute(&body, map[string]interface{}{
		"UserName":  userName,
		"ResetLink": resetLink,
	})

	return e.QueueEmail(to, "Password Reset Request - Acadistra", body.String(), "password_reset", nil, 1)
}

// Welcome Email for New Users
func (e *EmailService) SendWelcomeEmail(to, userName, role, schoolName, tempPassword string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#4F46E5;color:white;padding:20px;text-align:center;border-radius:5px 5px 0 0}.content{background:#f9f9f9;padding:20px;border:1px solid #ddd}.credentials{background:#fff;border:1px solid #ddd;padding:15px;border-radius:5px;margin:20px 0}.credentials p{margin:5px 0}.button{display:inline-block;background:#4F46E5;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head>
<body>
<div class="container">
<div class="header"><h1>Welcome to Acadistra</h1></div>
<div class="content">
<p>Hello {{.UserName}},</p>
<p>Your account has been created at <strong>{{.SchoolName}}</strong> as a <strong>{{.Role}}</strong>.</p>
<p>Your login credentials are:</p>
<div class="credentials">
<p><strong>Email:</strong> {{.Email}}</p>
<p><strong>Temporary Password:</strong> {{.TempPassword}}</p>
</div>
<p>Please change your password immediately after your first login.</p>
<a href="https://acadistra.com/login" class="button">Login to Acadistra</a>
<p>If you have any questions, contact your school administrator.</p>
<p>Best regards,<br>Acadistra System</p>
</div>
<div class="footer"><p>&copy; 2024 Acadistra. All rights reserved.</p></div>
</div>
</body>
</html>`

	t, _ := template.New("welcome").Parse(tmpl)
	var body bytes.Buffer
	t.Execute(&body, map[string]interface{}{
		"UserName":    userName,
		"Email":       to,
		"Role":        role,
		"SchoolName":  schoolName,
		"TempPassword": tempPassword,
	})

	return e.QueueEmail(to, "Welcome to Acadistra - Your Account is Ready", body.String(), "welcome", nil, 2)
}

// Attendance Alert Email
func (e *EmailService) SendAttendanceAlert(to, studentName, date string, presentCount, totalDays int) error {
	attendanceRate := (float64(presentCount) / float64(totalDays)) * 100
	tmpl := `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#4F46E5;color:white;padding:20px;text-align:center}.alert{background:#fff3cd;border:1px solid #ffc107;padding:15px;border-radius:5px;margin:20px 0}.stats{display:flex;justify-content:space-around;margin:20px 0}.stat-box{text-align:center;padding:15px;background:#f9f9f9;border-radius:5px}.stat-number{font-size:24px;font-weight:bold;color:#4F46E5}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head>
<body>
<div class="container">
<div class="header"><h1>Attendance Report</h1></div>
<div class="content">
<p>Dear Parent,</p>
<p>Here is the attendance report for <strong>{{.StudentName}}</strong> as of {{.Date}}:</p>
<div class="stats">
<div class="stat-box">
<div class="stat-number">{{.AttendanceRate}}%</div>
<p>Attendance Rate</p>
</div>
<div class="stat-box">
<div class="stat-number">{{.PresentCount}}</div>
<p>Days Present</p>
</div>
<div class="stat-box">
<div class="stat-number">{{.TotalDays}}</div>
<p>Total Days</p>
</div>
</div>
{{if lt .AttendanceRate 80}}
<div class="alert">
<strong>⚠️ Low Attendance Alert:</strong> Your child's attendance is below 80%. Please ensure regular school attendance.
</div>
{{end}}
<p>Best regards,<br>School Administration</p>
</div>
<div class="footer"><p>&copy; 2024 Acadistra. All rights reserved.</p></div>
</div>
</body>
</html>`

	t, _ := template.New("attendance").Parse(tmpl)
	var body bytes.Buffer
	t.Execute(&body, map[string]interface{}{
		"StudentName":    studentName,
		"Date":           date,
		"PresentCount":   presentCount,
		"TotalDays":      totalDays,
		"AttendanceRate": fmt.Sprintf("%.1f", attendanceRate),
	})

	return e.QueueEmail(to, fmt.Sprintf("Attendance Report - %s", studentName), body.String(), "attendance_alert", nil, 4)
}

// Grade Alert Email
func (e *EmailService) SendGradeAlert(to, studentName, subject, grade, term string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#4F46E5;color:white;padding:20px;text-align:center}.grade-box{background:#f0f0f0;border-left:4px solid #4F46E5;padding:15px;margin:20px 0}.grade-display{font-size:32px;font-weight:bold;color:#4F46E5;text-align:center}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head>
<body>
<div class="container">
<div class="header"><h1>Grade Report</h1></div>
<div class="content">
<p>Dear Parent,</p>
<p>{{.StudentName}} has received a grade for <strong>{{.Subject}}</strong> in {{.Term}}:</p>
<div class="grade-box">
<div class="grade-display">{{.Grade}}</div>
<p style="text-align:center;margin:10px 0">{{.Subject}}</p>
</div>
<p>Login to your parent portal to view detailed performance analytics and progress tracking.</p>
<p>Best regards,<br>School Administration</p>
</div>
<div class="footer"><p>&copy; 2024 Acadistra. All rights reserved.</p></div>
</div>
</body>
</html>`

	t, _ := template.New("grade").Parse(tmpl)
	var body bytes.Buffer
	t.Execute(&body, map[string]interface{}{
		"StudentName": studentName,
		"Subject":     subject,
		"Grade":       grade,
		"Term":        term,
	})

	return e.QueueEmail(to, fmt.Sprintf("Grade Alert - %s (%s)", subject, grade), body.String(), "grade_alert", nil, 4)
}

// Payment Confirmation Email
func (e *EmailService) SendPaymentConfirmation(to, studentName, amount, paymentMethod, transactionID string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#28a745;color:white;padding:20px;text-align:center}.receipt{background:#f9f9f9;border:1px solid #ddd;padding:20px;border-radius:5px;margin:20px 0}.receipt-row{display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #eee}.receipt-total{font-weight:bold;font-size:18px;color:#28a745}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head>
<body>
<div class="container">
<div class="header"><h1>✓ Payment Confirmed</h1></div>
<div class="content">
<p>Dear Parent,</p>
<p>Your payment has been successfully processed.</p>
<div class="receipt">
<div class="receipt-row"><span>Student:</span><span>{{.StudentName}}</span></div>
<div class="receipt-row"><span>Amount:</span><span>UGX {{.Amount}}</span></div>
<div class="receipt-row"><span>Payment Method:</span><span>{{.PaymentMethod}}</span></div>
<div class="receipt-row"><span>Transaction ID:</span><span>{{.TransactionID}}</span></div>
<div class="receipt-row receipt-total"><span>Status:</span><span>PAID</span></div>
</div>
<p>Thank you for your payment. Your receipt has been saved to your account.</p>
<p>Best regards,<br>School Administration</p>
</div>
<div class="footer"><p>&copy; 2024 Acadistra. All rights reserved.</p></div>
</div>
</body>
</html>`

	t, _ := template.New("payment").Parse(tmpl)
	var body bytes.Buffer
	t.Execute(&body, map[string]interface{}{
		"StudentName":   studentName,
		"Amount":        amount,
		"PaymentMethod": paymentMethod,
		"TransactionID": transactionID,
	})

	return e.QueueEmail(to, "Payment Confirmation - Acadistra", body.String(), "payment_confirmation", nil, 2)
}

// Health Alert Email
func (e *EmailService) SendHealthAlert(to, studentName, issue, date string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#dc3545;color:white;padding:20px;text-align:center}.alert-box{background:#f8d7da;border:1px solid #f5c6cb;padding:15px;border-radius:5px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head>
<body>
<div class="container">
<div class="header"><h1>Health Alert</h1></div>
<div class="content">
<p>Dear Parent,</p>
<p>We are notifying you of a health-related issue for <strong>{{.StudentName}}</strong> reported on {{.Date}}:</p>
<div class="alert-box">
<p><strong>Issue:</strong> {{.Issue}}</p>
</div>
<p>Please contact the school clinic for more details or if you have any concerns.</p>
<p>Best regards,<br>School Clinic</p>
</div>
<div class="footer"><p>&copy; 2024 Acadistra. All rights reserved.</p></div>
</div>
</body>
</html>`

	t, _ := template.New("health").Parse(tmpl)
	var body bytes.Buffer
	t.Execute(&body, map[string]interface{}{
		"StudentName": studentName,
		"Issue":       issue,
		"Date":        date,
	})

	return e.QueueEmail(to, fmt.Sprintf("Health Alert - %s", studentName), body.String(), "health_alert", nil, 1)
}

// Requisition Status Email
func (e *EmailService) SendRequisitionStatusEmail(to, requisitionID, status, reason string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#4F46E5;color:white;padding:20px;text-align:center}.status-box{background:#f9f9f9;border-left:4px solid #4F46E5;padding:15px;margin:20px 0}.status-approved{border-left-color:#28a745}.status-rejected{border-left-color:#dc3545}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head>
<body>
<div class="container">
<div class="header"><h1>Requisition Status Update</h1></div>
<div class="content">
<p>Dear Staff Member,</p>
<p>Your requisition has been <strong>{{.Status}}</strong>.</p>
<div class="status-box status-{{.Status}}">
<p><strong>Requisition ID:</strong> {{.RequisitionID}}</p>
<p><strong>Status:</strong> {{.Status}}</p>
{{if .Reason}}<p><strong>Reason:</strong> {{.Reason}}</p>{{end}}
</div>
<p>Login to your dashboard to view more details.</p>
<p>Best regards,<br>School Administration</p>
</div>
<div class="footer"><p>&copy; 2024 Acadistra. All rights reserved.</p></div>
</div>
</body>
</html>`

	t, _ := template.New("requisition").Parse(tmpl)
	var body bytes.Buffer
	t.Execute(&body, map[string]interface{}{
		"RequisitionID": requisitionID,
		"Status":        status,
		"Reason":        reason,
	})

	return e.QueueEmail(to, fmt.Sprintf("Requisition %s - %s", requisitionID, status), body.String(), "requisition_status", nil, 3)
}

// Payroll Notification Email
func (e *EmailService) SendPayrollNotification(to, staffName, month, year, amount string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#4F46E5;color:white;padding:20px;text-align:center}.payslip{background:#f9f9f9;border:1px solid #ddd;padding:20px;border-radius:5px;margin:20px 0}.amount{font-size:24px;font-weight:bold;color:#28a745}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head>
<body>
<div class="container">
<div class="header"><h1>Payroll Notification</h1></div>
<div class="content">
<p>Dear {{.StaffName}},</p>
<p>Your salary for {{.Month}} {{.Year}} has been processed.</p>
<div class="payslip">
<p><strong>Month:</strong> {{.Month}} {{.Year}}</p>
<div class="amount">UGX {{.Amount}}</div>
</div>
<p>Your payslip is available in your dashboard. Please review it for accuracy.</p>
<p>Best regards,<br>Human Resources</p>
</div>
<div class="footer"><p>&copy; 2024 Acadistra. All rights reserved.</p></div>
</div>
</body>
</html>`

	t, _ := template.New("payroll").Parse(tmpl)
	var body bytes.Buffer
	t.Execute(&body, map[string]interface{}{
		"StaffName": staffName,
		"Month":     month,
		"Year":      year,
		"Amount":    amount,
	})

	return e.QueueEmail(to, fmt.Sprintf("Payroll Notification - %s %s", month, year), body.String(), "payroll_notification", nil, 3)
}

// Student Registration Confirmation Email
func (e *EmailService) SendRegistrationConfirmation(to, studentName, admissionNumber, schoolName string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#4F46E5;color:white;padding:20px;text-align:center}.confirmation{background:#d4edda;border:1px solid #c3e6cb;padding:15px;border-radius:5px;margin:20px 0}.details{background:#f9f9f9;border:1px solid #ddd;padding:15px;border-radius:5px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head>
<body>
<div class="container">
<div class="header"><h1>Registration Confirmed</h1></div>
<div class="content">
<p>Dear Parent/Guardian,</p>
<p>Your child has been successfully registered at {{.SchoolName}}.</p>
<div class="confirmation">
<p>✓ Registration Successful</p>
</div>
<div class="details">
<p><strong>Student Name:</strong> {{.StudentName}}</p>
<p><strong>Admission Number:</strong> {{.AdmissionNumber}}</p>
<p><strong>School:</strong> {{.SchoolName}}</p>
</div>
<p>Please keep the admission number for future reference. You can now access the parent portal to track your child's progress.</p>
<p>Best regards,<br>School Administration</p>
</div>
<div class="footer"><p>&copy; 2024 Acadistra. All rights reserved.</p></div>
</div>
</body>
</html>`

	t, _ := template.New("registration").Parse(tmpl)
	var body bytes.Buffer
	t.Execute(&body, map[string]interface{}{
		"StudentName":     studentName,
		"AdmissionNumber": admissionNumber,
		"SchoolName":      schoolName,
	})

	return e.QueueEmail(to, "Student Registration Confirmation - Acadistra", body.String(), "registration_confirmation", nil, 2)
}

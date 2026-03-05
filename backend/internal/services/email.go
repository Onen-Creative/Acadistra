package services

import (
	"bytes"
	"fmt"
	"html/template"
	"net/smtp"
)

type EmailService struct {
	host     string
	port     int
	username string
	password string
	from     string
}

func NewEmailService(host string, port int, username, password, from string) *EmailService {
	return &EmailService{
		host:     host,
		port:     port,
		username: username,
		password: password,
		from:     from,
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

	return e.SendEmail(EmailRequest{
		To:      []string{to},
		Subject: fmt.Sprintf("Fees Invoice - %s %s", term, year),
		Body:    body.String(),
		IsHTML:  true,
	})
}

func (e *EmailService) SendResultsNotification(to, studentName, term, year string) error {
	body := fmt.Sprintf("Dear Parent,\n\n%s's results for %s %s are now available.\n\nLogin to view: https://yourschool.com/parent\n\nBest regards,\nSchool Administration", studentName, term, year)
	return e.SendEmail(EmailRequest{
		To:      []string{to},
		Subject: fmt.Sprintf("Results Available - %s %s", term, year),
		Body:    body,
		IsHTML:  false,
	})
}

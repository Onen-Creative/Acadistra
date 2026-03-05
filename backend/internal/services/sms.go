package services

import (
	"bytes"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type SMSService struct {
	apiKey   string
	username string
	senderID string
	baseURL  string
}

func NewSMSService(apiKey, username, senderID string) *SMSService {
	return &SMSService{
		apiKey:   apiKey,
		username: username,
		senderID: senderID,
		baseURL:  "https://api.africastalking.com/version1",
	}
}

type SMSRequest struct {
	To      []string
	Message string
}

func (s *SMSService) SendSMS(req SMSRequest) error {
	data := url.Values{}
	data.Set("username", s.username)
	data.Set("to", strings.Join(req.To, ","))
	data.Set("message", req.Message)
	if s.senderID != "" {
		data.Set("from", s.senderID)
	}

	httpReq, _ := http.NewRequest("POST", s.baseURL+"/messaging", bytes.NewBufferString(data.Encode()))
	httpReq.Header.Set("apiKey", s.apiKey)
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

package cron

import (
	"log"
	"time"

	"github.com/school-system/backend/internal/services/sms"
	"gorm.io/gorm"
)

type SMSScheduler struct {
	db         *gorm.DB
	smsService *sms.Service
	ticker     *time.Ticker
	done       chan bool
}

func NewSMSScheduler(db *gorm.DB) *SMSScheduler {
	return &SMSScheduler{
		db:         db,
		smsService: sms.NewService(db),
		done:       make(chan bool),
	}
}

// Start begins the SMS scheduler
func (s *SMSScheduler) Start() {
	s.ticker = time.NewTicker(1 * time.Minute)
	
	go func() {
		for {
			select {
			case <-s.ticker.C:
				s.processScheduledSMS()
			case <-s.done:
				return
			}
		}
	}()
	
	log.Println("SMS Scheduler started")
}

// Stop stops the SMS scheduler
func (s *SMSScheduler) Stop() {
	s.ticker.Stop()
	s.done <- true
	log.Println("SMS Scheduler stopped")
}

// processScheduledSMS processes all scheduled SMS
func (s *SMSScheduler) processScheduledSMS() {
	s.smsService.ProcessScheduled()
}

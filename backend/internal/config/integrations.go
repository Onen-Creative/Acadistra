package config

type IntegrationConfig struct {
	// Mobile Money
	FlutterwavePublicKey  string
	FlutterwaveSecretKey  string
	FlutterwaveEncryptKey string
	
	// SchoolPay
	SchoolPayBaseURL string
	
	// SMS
	AfricasTalkingAPIKey  string
	AfricasTalkingUsername string
	AfricasTalkingSenderID string
	
	// Email
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string
	
	// AWS SES (alternative)
	AWSRegion          string
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	SESFromEmail       string
}

func LoadIntegrationConfig() *IntegrationConfig {
	return &IntegrationConfig{
		FlutterwavePublicKey:  getEnv("FLUTTERWAVE_PUBLIC_KEY", ""),
		FlutterwaveSecretKey:  getEnv("FLUTTERWAVE_SECRET_KEY", ""),
		FlutterwaveEncryptKey: getEnv("FLUTTERWAVE_ENCRYPT_KEY", ""),
		
		SchoolPayBaseURL: getEnv("SCHOOLPAY_BASE_URL", "https://schoolpay.co.ug/paymentapi"),
		
		AfricasTalkingAPIKey:  getEnv("AFRICASTALKING_API_KEY", ""),
		AfricasTalkingUsername: getEnv("AFRICASTALKING_USERNAME", ""),
		AfricasTalkingSenderID: getEnv("AFRICASTALKING_SENDER_ID", ""),
		
		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     587,
		SMTPUsername: getEnv("SMTP_USERNAME", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", ""),
		
		AWSRegion:          getEnv("AWS_REGION", "us-east-1"),
		AWSAccessKeyID:     getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY", ""),
		SESFromEmail:       getEnv("SES_FROM_EMAIL", ""),
	}
}

#!/bin/bash

# Check Email Configuration Script
# This script verifies that email service is properly configured in production

echo "🔍 Checking Email Configuration..."
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    echo "   Please create it from .env.production.example"
    exit 1
fi

# Source the environment file
source .env.production

# Check SMTP configuration
echo "📧 SMTP Configuration:"
echo "   SMTP_HOST: ${SMTP_HOST:-NOT SET}"
echo "   SMTP_PORT: ${SMTP_PORT:-NOT SET}"
echo "   SMTP_USER: ${SMTP_USER:-NOT SET}"
echo "   SMTP_PASSWORD: ${SMTP_PASSWORD:+***SET***}"
echo "   SMTP_FROM: ${SMTP_FROM:-NOT SET}"
echo ""

# Check if all required variables are set
MISSING=0

if [ -z "$SMTP_HOST" ]; then
    echo "❌ SMTP_HOST is not set"
    MISSING=1
fi

if [ -z "$SMTP_PORT" ]; then
    echo "❌ SMTP_PORT is not set"
    MISSING=1
fi

if [ -z "$SMTP_USER" ]; then
    echo "❌ SMTP_USER is not set"
    MISSING=1
fi

if [ -z "$SMTP_PASSWORD" ]; then
    echo "❌ SMTP_PASSWORD is not set"
    MISSING=1
fi

if [ -z "$SMTP_FROM" ]; then
    echo "❌ SMTP_FROM is not set"
    MISSING=1
fi

if [ $MISSING -eq 1 ]; then
    echo ""
    echo "⚠️  Email service is NOT properly configured!"
    echo ""
    echo "To fix this, add the following to your .env.production file:"
    echo ""
    echo "# Email Configuration (Gmail example)"
    echo "SMTP_HOST=smtp.gmail.com"
    echo "SMTP_PORT=587"
    echo "SMTP_USERNAME=your-email@gmail.com"
    echo "SMTP_PASSWORD=your-app-password"
    echo "SMTP_FROM=noreply@acadistra.com"
    echo ""
    echo "For Gmail, you need to:"
    echo "1. Enable 2-factor authentication"
    echo "2. Generate an App Password at: https://myaccount.google.com/apppasswords"
    echo "3. Use the App Password (not your regular password)"
    exit 1
fi

echo "✅ All SMTP variables are set!"
echo ""

# Check if backend container is running
if docker ps | grep -q acadistra_backend; then
    echo "🐳 Backend container is running"
    
    # Check email queue stats
    echo ""
    echo "📊 Checking email queue status..."
    
    # Try to get email queue stats from the API
    RESPONSE=$(curl -s http://localhost:8080/health)
    if [ $? -eq 0 ]; then
        echo "✅ Backend API is responding"
    else
        echo "⚠️  Backend API is not responding"
    fi
else
    echo "⚠️  Backend container is not running"
    echo "   Start it with: docker compose -f docker-compose.prod.yml up -d"
fi

echo ""
echo "📝 To view email queue logs:"
echo "   docker logs acadistra_backend | grep -i email"
echo ""
echo "📝 To restart services with new config:"
echo "   docker compose -f docker-compose.prod.yml down"
echo "   docker compose -f docker-compose.prod.yml up -d"

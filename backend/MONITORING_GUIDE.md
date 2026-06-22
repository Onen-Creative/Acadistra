# System Monitoring Guide

## Overview
The Acadistra system includes comprehensive monitoring and auditing capabilities to track system health, user activity, and performance metrics in real-time.

## Features

### 1. **Real-Time Monitoring**
- Active users (last 30 minutes)
- Active sessions tracking
- Response time monitoring (microsecond precision)
- Error rate tracking
- Request volume analytics

### 2. **Session Management**
- Automatic session creation on login
- Activity-based session tracking
- Auto-expiration of inactive sessions (2 hours)
- Session duration calculation

### 3. **Performance Metrics**
- API response times (avg, min, max)
- Slowest endpoints identification
- Request success/failure rates
- Database query performance

### 4. **Daily Reports**
- Automated daily report generation (1 AM)
- Historical data up to 90 days
- User activity trends
- Peak hour analysis
- School-wise activity breakdown

### 5. **Audit Logging**
- Complete audit trail for all data changes
- User action tracking
- Resource-level change detection
- IP address and user agent logging

## API Endpoints

### System Admin Only

#### Get Active Users
```http
GET /api/v1/monitoring/active-users
```
Returns list of currently active users with session details.

#### Get System Stats
```http
GET /api/v1/monitoring/system-stats
```
Returns current system statistics including active users, sessions, and error rates.

#### Get System Health
```http
GET /api/v1/monitoring/system-health
```
Returns comprehensive health metrics including:
- System status (healthy/degraded/unhealthy/slow)
- Active users and sessions
- Request/error rates from last hour
- Average and max response times
- System uptime

#### Get Daily Reports
```http
GET /api/v1/monitoring/daily-reports?days=7
```
Returns daily aggregated reports for specified number of days.

#### Get Audit Logs
```http
GET /api/v1/monitoring/audit-logs?action=create&user_role=teacher&limit=50
```
Returns filtered audit logs with pagination.

Query Parameters:
- `action`: Filter by action (create, update, delete, login, logout)
- `user_role`: Filter by user role
- `school_id`: Filter by school
- `start_date`: Filter by start date
- `end_date`: Filter by end date
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

#### Generate Daily Report
```http
POST /api/v1/monitoring/generate-daily-report?date=2026-06-15
```
Manually generates or updates a daily report for the specified date.

#### Get Performance Metrics
```http
GET /api/v1/monitoring/performance-metrics?hours=24
```
Returns system performance metrics for specified hours.

#### Get Slowest Endpoints
```http
GET /api/v1/monitoring/slowest-endpoints?hours=24&limit=10
```
Returns the slowest API endpoints.

#### Get Error Analysis
```http
GET /api/v1/monitoring/error-analysis?hours=24
```
Returns error breakdown by endpoint and status code.

## Background Tasks

### Automatic Processes

1. **System Metrics Collection** (Every 5 minutes)
   - Collects active users, sessions, request counts
   - Calculates error rates and response times
   - Stores in `system_metrics` table

2. **Session Expiration** (Every 15 minutes)
   - Expires sessions with no activity for 2+ hours
   - Updates `user_sessions` table

3. **Daily Report Generation** (1 AM daily)
   - Generates comprehensive report for previous day
   - Includes all metrics and analytics
   - Stores in `daily_system_reports` table

4. **Log Cleanup** (Daily)
   - Removes logs older than 90 days
   - Cleans up old inactive sessions
   - Maintains database performance

## Database Schema

### user_sessions
Tracks active user sessions:
- `id`: Session UUID
- `user_id`: User identifier
- `school_id`: School identifier (nullable)
- `token`: JWT access token (hashed)
- `ip_address`: Client IP
- `user_agent`: Browser/client info
- `login_at`: Session start time
- `last_activity`: Last API request time
- `logout_at`: Session end time (nullable)
- `is_active`: Session status

### api_request_logs
Logs all API requests:
- `id`: Log UUID
- `user_id`: User identifier (nullable)
- `school_id`: School identifier (nullable)
- `method`: HTTP method (GET, POST, etc.)
- `path`: API endpoint
- `status_code`: HTTP status code
- `response_time`: Response time in milliseconds (decimal precision)
- `ip_address`: Client IP
- `user_agent`: Browser/client info
- `timestamp`: Request timestamp
- `error_message`: Error details (if any)

### daily_system_reports
Daily aggregated reports:
- `id`: Report UUID
- `date`: Report date
- `total_users`: Total registered users
- `active_users`: Users active on this day
- `total_sessions`: Total login sessions
- `avg_session_duration`: Average session length (minutes)
- `total_requests`: Total API requests
- `successful_requests`: Successful requests (2xx, 3xx)
- `failed_requests`: Failed requests (4xx, 5xx)
- `avg_response_time`: Average response time (ms)
- `peak_hour`: Hour with most activity
- `peak_hour_requests`: Requests during peak hour
- `error_rate`: Percentage of failed requests
- `top_errors`: JSON of top error types
- `school_activity`: JSON of per-school activity

### audit_logs
Complete audit trail:
- `id`: Log UUID
- `actor_user_id`: User who performed action
- `school_id`: School context
- `user_role`: User's role
- `action`: Action type (create, update, delete)
- `resource_type`: Type of resource affected
- `resource_id`: Resource identifier
- `class_id`: Class context (if applicable)
- `before`: Resource state before change (JSON)
- `after`: Resource state after change (JSON)
- `ip`: Client IP
- `user_agent`: Browser/client info
- `timestamp`: Action timestamp

## Monitoring Best Practices

### 1. Regular Review
- Check daily reports every morning
- Monitor error rates and response times
- Review audit logs for suspicious activity

### 2. Performance Optimization
- Identify and optimize slowest endpoints
- Monitor database query performance
- Track response time trends

### 3. Security
- Review audit logs for unauthorized access attempts
- Monitor login/logout patterns
- Track data modification patterns

### 4. Capacity Planning
- Monitor active user trends
- Track session counts
- Analyze peak hours for resource allocation

## Manual Operations

### Generate Reports for Past Dates
```bash
# Via API (for each date)
curl -X POST "http://localhost:8080/api/v1/monitoring/generate-daily-report?date=2026-06-15" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Via Database
psql -d school_system_db -f scripts/generate_monitoring_reports.sql
```

### Check System Health
```bash
curl -X GET "http://localhost:8080/api/v1/monitoring/system-health" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

### Export Audit Logs
```sql
COPY (
  SELECT 
    al.*,
    u.full_name as user_name,
    u.email as user_email,
    s.name as school_name
  FROM audit_logs al
  LEFT JOIN users u ON al.actor_user_id = u.id
  LEFT JOIN schools s ON al.school_id = s.id
  WHERE al.timestamp >= '2026-06-01'
    AND al.timestamp < '2026-07-01'
  ORDER BY al.timestamp DESC
) TO '/tmp/audit_logs_june_2026.csv' CSV HEADER;
```

## Troubleshooting

### Issue: Response times showing 0ms
**Solution**: The system now uses microsecond precision. If still showing 0ms:
1. Check if `api_request_logs` table has data
2. Verify `RequestLogger` middleware is active
3. Check database for actual response_time values

### Issue: No active sessions showing
**Solution**: 
1. Verify users are logging in (check JWT tokens)
2. Check `user_sessions` table for records
3. Ensure session creation happens in auth handler
4. Check if sessions expired (last_activity > 2 hours ago)

### Issue: Session duration shows 0m
**Solution**:
1. Ensure users log out properly
2. Check if `logout_at` or `last_activity` is set
3. Session duration only calculated when session has meaningful activity
4. Very short sessions (<1 minute) may show as 0m

### Issue: Daily reports not generating
**Solution**:
1. Check if background task is running
2. Manually trigger report generation via API
3. Verify `api_request_logs` and `user_sessions` have data
4. Check system logs for errors

## Frontend Integration

The monitoring dashboard at `/system/monitoring` provides:
- Real-time metrics display
- Interactive charts and graphs
- Filterable audit logs
- Daily report visualization
- One-click report generation

## Configuration

### Environment Variables
```bash
# Monitoring is always enabled, but you can configure:
PROMETHEUS_ENABLED=true  # For Prometheus metrics (if needed)
```

### Retention Periods
- **API Request Logs**: 90 days (configurable in cleanup task)
- **System Metrics**: 90 days
- **Inactive Sessions**: 90 days
- **Daily Reports**: Indefinite (manual cleanup recommended annually)

## Security Considerations

1. **Access Control**: Only system admins can access monitoring endpoints
2. **Sensitive Data**: Passwords and tokens are never logged
3. **PII Protection**: Personal data in audit logs should be reviewed regularly
4. **Compliance**: Audit logs help with GDPR/data protection compliance

## Performance Impact

The monitoring system is designed to have minimal performance impact:
- Async logging (no blocking)
- Indexed database queries
- Automatic cleanup of old data
- Efficient aggregation queries
- Background task scheduling

## Roadmap

Future enhancements planned:
- [ ] Real-time WebSocket updates
- [ ] Alert/notification system
- [ ] Custom metric dashboards
- [ ] Prometheus/Grafana integration
- [ ] Advanced anomaly detection
- [ ] Machine learning-based predictions

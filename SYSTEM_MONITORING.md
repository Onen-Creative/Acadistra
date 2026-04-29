# System Monitoring & Audit Logging

Complete system monitoring solution for Acadistra with active user tracking, enhanced audit logging, performance metrics, and daily reports.

## Features

### 1. Active User Sessions
- Track all logged-in users in real-time
- Monitor session activity (last activity timestamp)
- View user details: name, email, role, school, IP address
- Automatic session timeout after 30 minutes of inactivity

### 2. Enhanced Audit Logging
The audit log now captures:
- **School**: Which school the action belongs to
- **User Role**: Role of the user performing the action (teacher, admin, etc.)
- **Action**: Type of action (create, update, delete)
- **Resource**: What was modified (student, class, marks, etc.)
- **Class**: Associated class if applicable
- **Date & Time**: Precise timestamp
- **IP Address**: User's IP address
- **User Agent**: Browser/device information
- **Before/After**: Data changes

### 3. API Request Logging
- Log all API requests with response times
- Track slow endpoints
- Monitor error rates
- Identify performance bottlenecks

### 4. System Performance Metrics
Collected every 5 minutes:
- Active users count
- Active sessions count
- Total requests
- Average response time
- Error rate
- Database query performance
- Memory usage
- CPU usage

### 5. Daily System Reports
Generated automatically at 1 AM daily:
- Total and active users
- Session statistics
- Request statistics (total, successful, failed)
- Average response time
- Slowest endpoints
- Peak usage hours
- Error analysis
- School-wise activity breakdown

## API Endpoints

### System Admin Only

#### Get Active Users
```http
GET /api/v1/monitoring/active-users
Authorization: Bearer {token}
```

Response:
```json
{
  "total": 15,
  "users": [
    {
      "user_id": "uuid",
      "user_name": "John Doe",
      "user_email": "john@school.com",
      "user_role": "teacher",
      "school_id": "uuid",
      "school_name": "ABC School",
      "ip_address": "192.168.1.100",
      "login_at": "2024-05-01T08:30:00Z",
      "last_activity": "2024-05-01T09:15:00Z"
    }
  ]
}
```

#### Get Enhanced Audit Logs
```http
GET /api/v1/monitoring/audit-logs?page=1&limit=50&action=create&school_id=uuid&user_role=teacher&start_date=2024-05-01&end_date=2024-05-31
Authorization: Bearer {token}
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `action`: Filter by action (create, update, delete)
- `school_id`: Filter by school
- `user_role`: Filter by user role
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)

Response:
```json
{
  "logs": [
    {
      "id": "uuid",
      "actor_user_id": "uuid",
      "school_id": "uuid",
      "user_role": "teacher",
      "action": "create",
      "resource_type": "mark",
      "resource_id": "uuid",
      "class_id": "uuid",
      "timestamp": "2024-05-01T10:30:00Z",
      "ip": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "user_name": "Jane Smith",
      "user_email": "jane@school.com",
      "school_name": "ABC School",
      "class_name": "P5 Blue",
      "after": {
        "student_id": "uuid",
        "marks": 85
      }
    }
  ],
  "total": 1250,
  "page": 1,
  "limit": 50
}
```

#### Get System Statistics
```http
GET /api/v1/monitoring/system-stats
Authorization: Bearer {token}
```

Response:
```json
{
  "active_users": 45,
  "active_sessions": 52,
  "requests_last_hour": 1250,
  "errors_last_hour": 15,
  "error_rate": 1.2,
  "avg_response_time_ms": 125.5,
  "school_activity": [
    {
      "school_id": "uuid",
      "school_name": "ABC School",
      "active_users": 25,
      "active_sessions": 30
    }
  ],
  "timestamp": "2024-05-01T10:00:00Z"
}
```

#### Get Daily Reports
```http
GET /api/v1/monitoring/daily-reports?days=7
Authorization: Bearer {token}
```

Response:
```json
{
  "reports": [
    {
      "id": "uuid",
      "date": "2024-05-01",
      "total_users": 500,
      "active_users": 320,
      "total_sessions": 450,
      "avg_session_duration": 45.5,
      "total_requests": 15000,
      "successful_requests": 14500,
      "failed_requests": 500,
      "avg_response_time": 150.2,
      "slowest_endpoint": "/api/v1/results",
      "slowest_response_time": 2500.0,
      "peak_hour": 10,
      "peak_hour_requests": 2500,
      "error_rate": 3.33,
      "top_errors": [
        {
          "path": "/api/v1/students",
          "status_code": 404,
          "count": 50
        }
      ],
      "school_activity": [
        {
          "id": "uuid",
          "name": "ABC School",
          "active_users": 150,
          "sessions": 200,
          "api_requests": 5000
        }
      ]
    }
  ],
  "days": 7
}
```

#### Get Performance Metrics
```http
GET /api/v1/monitoring/performance-metrics?hours=24
Authorization: Bearer {token}
```

#### Get Slowest Endpoints
```http
GET /api/v1/monitoring/slowest-endpoints?hours=24&limit=10
Authorization: Bearer {token}
```

Response:
```json
{
  "endpoints": [
    {
      "path": "/api/v1/results",
      "avg_response_time_ms": 850.5,
      "max_response_time_ms": 2500.0,
      "request_count": 1250
    }
  ],
  "hours": 24
}
```

#### Get Error Analysis
```http
GET /api/v1/monitoring/error-analysis?hours=24
Authorization: Bearer {token}
```

Response:
```json
{
  "errors": [
    {
      "path": "/api/v1/students/uuid",
      "status_code": 404,
      "error_count": 125,
      "last_occured": "2024-05-01T15:30:00Z"
    }
  ],
  "hours": 24
}
```

#### Generate Daily Report (Manual)
```http
POST /api/v1/monitoring/generate-daily-report?date=2024-05-01
Authorization: Bearer {token}
```

## Database Tables

### user_sessions
Tracks active user sessions:
- `id`: Session ID
- `user_id`: User ID
- `school_id`: School ID
- `token`: JWT token
- `ip_address`: User's IP
- `user_agent`: Browser/device info
- `login_at`: Login timestamp
- `last_activity`: Last activity timestamp
- `logout_at`: Logout timestamp
- `is_active`: Session status

### audit_logs (Enhanced)
Enhanced audit logging:
- `id`: Log ID
- `actor_user_id`: User who performed action
- `school_id`: School context
- `user_role`: User's role
- `action`: Action type
- `resource_type`: Resource affected
- `resource_id`: Resource ID
- `class_id`: Associated class
- `before`: Data before change
- `after`: Data after change
- `timestamp`: When action occurred
- `ip`: User's IP address
- `user_agent`: Browser/device info

### api_request_logs
Logs all API requests:
- `id`: Log ID
- `user_id`: User making request
- `school_id`: School context
- `method`: HTTP method
- `path`: API endpoint
- `status_code`: Response status
- `response_time`: Response time in ms
- `ip_address`: User's IP
- `user_agent`: Browser/device info
- `timestamp`: Request timestamp
- `error_message`: Error details if any

### system_metrics
System performance metrics:
- `id`: Metric ID
- `timestamp`: Collection time
- `active_users`: Active user count
- `active_sessions`: Active session count
- `total_requests`: Request count
- `avg_response_time`: Average response time
- `error_rate`: Error percentage
- `database_query_time`: DB query time
- `memory_usage_mb`: Memory usage
- `cpu_usage_percent`: CPU usage

### daily_system_reports
Daily aggregated reports:
- `id`: Report ID
- `date`: Report date
- `total_users`: Total users
- `active_users`: Active users
- `total_sessions`: Session count
- `avg_session_duration`: Average session length
- `total_requests`: Total API requests
- `successful_requests`: Successful requests
- `failed_requests`: Failed requests
- `avg_response_time`: Average response time
- `slowest_endpoint`: Slowest API endpoint
- `slowest_response_time`: Slowest response time
- `peak_hour`: Peak usage hour
- `peak_hour_requests`: Requests at peak
- `error_rate`: Error percentage
- `top_errors`: Top error details (JSON)
- `school_activity`: School-wise activity (JSON)

## Background Tasks

### Metrics Collection
Runs every 5 minutes:
- Collects current system metrics
- Stores in `system_metrics` table

### Daily Report Generation
Runs at 1:00 AM daily:
- Generates comprehensive daily report
- Analyzes previous day's data
- Stores in `daily_system_reports` table

### Log Cleanup
Runs daily:
- Removes logs older than 90 days
- Keeps database size manageable
- Maintains performance

## Migration

Run the migration to create monitoring tables:

```bash
# Apply migration
docker exec acadistra_backend ./main migrate

# Or manually
psql -U postgres -d school_system_db -f backend/migrations/20260501000000_system_monitoring.sql
```

## Usage Examples

### Monitor Active Users
```bash
curl -X GET "http://localhost:8080/api/v1/monitoring/active-users" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View Audit Logs for Specific School
```bash
curl -X GET "http://localhost:8080/api/v1/monitoring/audit-logs?school_id=SCHOOL_UUID&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check System Performance
```bash
curl -X GET "http://localhost:8080/api/v1/monitoring/system-stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Last 7 Days Reports
```bash
curl -X GET "http://localhost:8080/api/v1/monitoring/daily-reports?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Benefits

1. **Real-time Monitoring**: See who's logged in and what they're doing
2. **Comprehensive Audit Trail**: Track all system changes with full context
3. **Performance Insights**: Identify slow endpoints and bottlenecks
4. **Error Tracking**: Monitor and analyze system errors
5. **Usage Analytics**: Understand system usage patterns
6. **School-wise Reporting**: Track activity per school
7. **Compliance**: Meet audit and compliance requirements
8. **Troubleshooting**: Quickly identify and resolve issues

## Security

- All monitoring endpoints require system admin authentication
- Sensitive data (passwords, tokens) never logged
- IP addresses tracked for security auditing
- Session tokens stored securely
- Automatic session timeout after inactivity

## Performance

- Asynchronous logging (non-blocking)
- Automatic log cleanup (90-day retention)
- Indexed database tables for fast queries
- Efficient aggregation queries
- Minimal overhead on API requests

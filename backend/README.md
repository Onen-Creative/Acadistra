# Acadistra - Backend

Go backend API for Acadistra school management system.

## Quick Deploy to Railway

1. Push this repository to GitHub
2. Connect to Railway
3. Set environment variables
4. Deploy

## Environment Variables

```
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=acadistra
JWT_SECRET=your-jwt-secret
SERVER_PORT=8080
SERVER_ENV=production
```

## Local Development

```bash
go run cmd/api/main.go
```
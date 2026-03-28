#!/bin/bash

echo "🔧 Fixing API URL configuration..."

# Stop the frontend container
docker stop acadistra_frontend

# Remove the frontend container and image
docker rm acadistra_frontend
docker rmi acadistra_frontend || true

# Rebuild frontend with correct environment variables
cd /home/od/workspace/programming/school\ management\ system

# Build with explicit environment variables
docker compose -f docker-compose.prod.yml build --no-cache frontend

# Start the frontend container
docker compose -f docker-compose.prod.yml up -d frontend

echo "✅ Frontend rebuilt with correct API URL"
echo "🌐 API URL should now be: https://acadistra.com"

# Show the logs to verify
echo "📋 Frontend logs:"
docker logs acadistra_frontend --tail 20
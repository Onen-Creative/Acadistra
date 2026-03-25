#!/bin/bash
echo "=== Docker Container Status ==="
docker ps -a

echo -e "\n=== Backend Logs (last 50 lines) ==="
docker logs acadistra_backend --tail 50

echo -e "\n=== Frontend Logs (last 50 lines) ==="
docker logs acadistra_frontend --tail 50

echo -e "\n=== Caddy Logs (last 30 lines) ==="
docker logs acadistra_caddy --tail 30

echo -e "\n=== Port Listening ==="
netstat -tlnp | grep -E ':(80|443|8080|3000)'

echo -e "\n=== Disk Space ==="
df -h

echo -e "\n=== Memory Usage ==="
free -h

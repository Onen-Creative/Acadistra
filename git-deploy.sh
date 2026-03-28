#!/bin/bash

echo "🔄 Git-based deployment to VPS..."

# Add and commit changes
git add .
git commit -m "Fix: Update API URL from localhost to https://acadistra.com

- Fixed frontend API calls pointing to localhost:8080
- Updated service worker to handle proper domain
- Rebuilt with correct production environment variables"

# Push to repository
git push origin main

echo "📤 Changes pushed to repository"
echo "🔧 Now run this on your VPS:"
echo ""
echo "ssh your-username@your-vps-ip"
echo "cd /path/to/acadistra"
echo "git pull origin main"
echo "bash deploy-fix.sh"
echo ""
echo "Or use the manual steps in MANUAL_DEPLOYMENT.md"
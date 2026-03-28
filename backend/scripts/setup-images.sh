#!/bin/bash

# Backend Image Setup Script
# Run this inside the backend container to ensure proper image directories

set -e

echo "🖼️  Setting up backend image directories..."

# Create necessary directories
mkdir -p public/logos
mkdir -p public/photos
mkdir -p public/photos/thumbs

# Set proper permissions
chmod 755 public
chmod 755 public/logos  
chmod 755 public/photos
chmod 755 public/photos/thumbs

# Create .gitkeep files
touch public/logos/.gitkeep
touch public/photos/.gitkeep
touch public/photos/thumbs/.gitkeep

echo "✅ Backend image directories setup complete!"

# List directory structure
echo "📋 Directory structure:"
ls -la public/
ls -la public/photos/

echo "🎉 Ready to serve images!"
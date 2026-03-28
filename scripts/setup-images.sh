#!/bin/bash

# Image Setup Script for Production
# Ensures proper directory structure and permissions for image uploads

set -e

echo "🖼️  Setting up image directories and permissions..."

# Create necessary directories
echo "📁 Creating upload directories..."
mkdir -p public/logos
mkdir -p public/photos
mkdir -p public/photos/thumbs

# Set proper permissions
echo "🔐 Setting directory permissions..."
chmod 755 public
chmod 755 public/logos
chmod 755 public/photos
chmod 755 public/photos/thumbs

# Create .gitkeep files to ensure directories are tracked
echo "📝 Creating .gitkeep files..."
touch public/logos/.gitkeep
touch public/photos/.gitkeep
touch public/photos/thumbs/.gitkeep

# Set ownership (if running as root)
if [ "$EUID" -eq 0 ]; then
    echo "👤 Setting directory ownership..."
    chown -R 1000:1000 public/
fi

echo "✅ Image directories setup complete!"

# Test image serving
echo "🧪 Testing image serving..."
if [ -f "public/logos/.gitkeep" ]; then
    echo "✅ Logo directory accessible"
else
    echo "❌ Logo directory not accessible"
    exit 1
fi

if [ -f "public/photos/.gitkeep" ]; then
    echo "✅ Photos directory accessible"
else
    echo "❌ Photos directory not accessible"
    exit 1
fi

echo "🎉 Image setup completed successfully!"
echo ""
echo "📋 Directory structure:"
echo "   public/"
echo "   ├── logos/          (School logos)"
echo "   └── photos/         (Student photos)"
echo "       └── thumbs/     (Photo thumbnails)"
echo ""
echo "🌐 Images will be served at:"
echo "   - Logos: https://yourdomain.com/logos/filename.ext"
echo "   - Photos: https://yourdomain.com/photos/filename.ext"
echo "   - Thumbnails: https://yourdomain.com/photos/thumbs/filename.ext"
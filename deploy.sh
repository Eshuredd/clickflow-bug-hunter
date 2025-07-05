#!/bin/bash

# DigitalOcean Deployment Script
echo "Starting deployment process..."

# Navigate to backend directory
cd backend

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building TypeScript..."
npm run build

# Check if build was successful
if [ -f "dist/server.js" ]; then
    echo "✅ Build successful - server.js found"
    echo "Contents of dist folder:"
    ls -la dist/
else
    echo "❌ Build failed - server.js not found"
    exit 1
fi

# Start the application
echo "Starting application..."
npm start 
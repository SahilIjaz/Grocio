#!/bin/bash

# EC2 Deployment Script
# This script deploys the API to the EC2 instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
EC2_HOST="ec2-13-53-205-180.eu-north-1.compute.amazonaws.com"
EC2_USER="ubuntu"
EC2_KEY_PATH="$HOME/.ssh/grocio-ec2.pem"
REPO_PATH="/home/ubuntu/Grocio"

echo -e "${YELLOW}Starting EC2 Deployment...${NC}"

# Check if SSH key exists
if [ ! -f "$EC2_KEY_PATH" ]; then
    echo -e "${RED}Error: SSH key not found at $EC2_KEY_PATH${NC}"
    echo "Please ensure your EC2 SSH key is at: $EC2_KEY_PATH"
    exit 1
fi

# Deploy to EC2
echo -e "${YELLOW}Connecting to EC2 instance...${NC}"

ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
    set -e

    echo "Starting deployment..."

    # Navigate to repo
    cd /home/ubuntu/Grocio

    # Pull latest changes
    echo "Pulling latest code from main branch..."
    git pull origin main

    # Install dependencies
    echo "Installing dependencies..."
    pnpm install

    # Build API
    echo "Building API..."
    pnpm build --filter=@grocio/api

    # Navigate to API directory
    cd apps/api

    # Generate Prisma client
    echo "Generating Prisma client..."
    pnpm prisma generate

    # Restart or start the API with PM2
    echo "Starting API with PM2..."
    pm2 restart grocio-api || pm2 start dist/server.js --name grocio-api
    pm2 save

    # Show status
    pm2 list

    echo "Deployment complete!"

ENDSSH

echo -e "${GREEN}✓ EC2 Deployment Successful!${NC}"
echo ""
echo "API URL: http://$EC2_HOST:3001"
echo "Health Check: http://$EC2_HOST:3001/api/v1/health"

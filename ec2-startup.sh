#!/bin/bash

# EC2 API Startup Script
# Run this on your EC2 instance to ensure the API is running

set -e

echo "═══════════════════════════════════════════════════════════"
echo "    GROCIO API STARTUP SCRIPT"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Check current PM2 status
echo -e "${YELLOW}[1] Checking current PM2 status...${NC}"
pm2 list
echo ""

# Step 2: Stop any existing process
echo -e "${YELLOW}[2] Stopping any existing grocio-api process...${NC}"
pm2 stop grocio-api 2>/dev/null || true
pm2 delete grocio-api 2>/dev/null || true
echo "Done"
echo ""

# Step 3: Navigate to API directory
echo -e "${YELLOW}[3] Navigating to API directory...${NC}"
cd /home/ubuntu/Grocio
echo "Current directory: $(pwd)"
echo ""

# Step 4: Pull latest changes
echo -e "${YELLOW}[4] Pulling latest code...${NC}"
git pull origin main
echo ""

# Step 5: Install dependencies
echo -e "${YELLOW}[5] Installing dependencies...${NC}"
pnpm install
echo ""

# Step 6: Build API
echo -e "${YELLOW}[6] Building API...${NC}"
pnpm build --filter=@grocio/api
echo ""

# Step 7: Navigate to API directory
echo -e "${YELLOW}[7] Navigating to API app directory...${NC}"
cd /home/ubuntu/Grocio/apps/api
echo "Current directory: $(pwd)"
echo ""

# Step 8: Generate Prisma client
echo -e "${YELLOW}[8] Generating Prisma client...${NC}"
pnpm prisma generate
echo ""

# Step 9: Start API with PM2
echo -e "${YELLOW}[9] Starting API with PM2...${NC}"
pm2 start dist/server.js --name grocio-api
echo ""

# Step 10: Save PM2 state
echo -e "${YELLOW}[10] Saving PM2 state...${NC}"
pm2 save
echo ""

# Step 11: Show PM2 status
echo -e "${YELLOW}[11] PM2 Status:${NC}"
pm2 list
echo ""

# Step 12: Show PM2 logs
echo -e "${YELLOW}[12] Latest logs (last 20 lines):${NC}"
pm2 logs grocio-api --lines 20 --nostream
echo ""

# Step 13: Check if port 3001 is listening
echo -e "${YELLOW}[13] Checking if port 3001 is listening...${NC}"
if lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Port 3001 is listening${NC}"
    lsof -i :3001
else
    echo -e "${RED}✗ Port 3001 is NOT listening${NC}"
fi
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}    API STARTUP COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "API should be accessible at:"
echo "http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001"
echo ""

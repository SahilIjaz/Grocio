#!/bin/bash

# Backend Diagnostic Script
# Run this script to check if the API is responding

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001"
HEALTH_ENDPOINT="$API_URL/api/v1/health"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    GROCIO BACKEND DIAGNOSTIC TOOL${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Test 1: Check if API is responding
echo -e "${YELLOW}[1] Testing if API is responding...${NC}"
if curl -s -m 5 "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API is responding${NC}"
    echo "Response:"
    curl -s "$HEALTH_ENDPOINT" | python3 -m json.tool 2>/dev/null || curl -s "$HEALTH_ENDPOINT"
else
    echo -e "${RED}✗ API is NOT responding${NC}"
    echo -e "${YELLOW}The API at $API_URL is not accessible${NC}"
fi

echo ""

# Test 2: Check DNS resolution
echo -e "${YELLOW}[2] Checking DNS resolution...${NC}"
if nslookup ec2-13-53-205-180.eu-north-1.compute.amazonaws.com > /dev/null 2>&1; then
    echo -e "${GREEN}✓ DNS resolves correctly${NC}"
    nslookup ec2-13-53-205-180.eu-north-1.compute.amazonaws.com | grep "Address:"
else
    echo -e "${RED}✗ DNS resolution failed${NC}"
fi

echo ""

# Test 3: Check port connectivity
echo -e "${YELLOW}[3] Checking port 3001 connectivity...${NC}"
if timeout 5 bash -c "</dev/tcp/ec2-13-53-205-180.eu-north-1.compute.amazonaws.com/3001" 2>/dev/null; then
    echo -e "${GREEN}✓ Port 3001 is open and reachable${NC}"
else
    echo -e "${RED}✗ Cannot connect to port 3001${NC}"
    echo "   Possible issues:"
    echo "   - EC2 security group doesn't allow inbound traffic on port 3001"
    echo "   - API is not running on EC2"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}If tests failed, check the following:${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "1. Check GitHub Actions Deployment Status:"
echo "   https://github.com/SahilIjaz/Grocio/actions"
echo ""
echo "2. SSH into EC2 and check API status:"
echo "   ssh -i your-key.pem ubuntu@ec2-13-53-205-180.eu-north-1.compute.amazonaws.com"
echo "   pm2 list"
echo "   pm2 logs grocio-api"
echo ""
echo "3. Check EC2 Security Group:"
echo "   - Port 3001 should allow inbound traffic from 0.0.0.0/0"
echo ""
echo "4. Check if API has database connection:"
echo "   - DATABASE_URL environment variable should be set"
echo "   - REDIS_URL should be set"
echo ""

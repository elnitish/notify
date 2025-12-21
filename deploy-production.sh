#!/bin/bash

# 🚀 Production Deployment Script
# Deploy database integration to production server

echo "🚀 Starting deployment to production..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from GitHub...${NC}"
git pull origin master
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm install failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}🔄 Restarting server with PM2...${NC}"
    
    # Check if bot_m process exists
    if pm2 list | grep -q "bot_m"; then
        pm2 restart bot_m
    else
        pm2 start index.js --name bot_m
    fi
    
    pm2 save
    echo -e "${GREEN}✅ Server restarted${NC}"
    echo ""
    
    # Show logs
    echo -e "${YELLOW}📋 Recent logs:${NC}"
    pm2 logs bot_m --lines 20 --nostream
    
else
    echo -e "${YELLOW}⚠️  PM2 not found. Please start manually:${NC}"
    echo "   npm start"
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""

# Step 4: Verify database files
echo -e "${YELLOW}💾 Checking database files...${NC}"
if [ -f "notifications.db" ]; then
    ls -lh notifications.db*
    echo -e "${GREEN}✅ Database files found${NC}"
else
    echo -e "${YELLOW}⚠️  Database not created yet (will be created on first run)${NC}"
fi

echo ""
echo -e "${YELLOW}🧪 Testing API endpoints...${NC}"

# Wait a moment for server to start
sleep 2

# Test API
RESPONSE=$(curl -s http://localhost:3045/api/stats 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API is responding${NC}"
    echo "Response: $RESPONSE"
else
    echo -e "${YELLOW}⚠️  API not responding yet (server may still be starting)${NC}"
fi

echo ""
echo -e "${GREEN}✅ All done! Check the dashboard:${NC}"
echo "   https://vault.visad.co.uk/notify/"
echo ""

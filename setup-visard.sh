#!/bin/bash

echo "🎫 VISARD Visa Slots Monitor - Quick Setup"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  Please edit .env and add your Telegram credentials:"
    echo "   - API_ID"
    echo "   - API_HASH"
    echo "   - SESSION_STRING"
    echo ""
    echo "Run this script again after configuring .env"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check if MONITORED_USERS is set to VISARD
if grep -q "MONITORED_USERS=visard" .env || grep -q "MONITORED_USERS=VISARD" .env; then
    echo "✅ VISARD bot monitoring is configured"
else
    echo "⚠️  VISARD bot not found in MONITORED_USERS"
    echo ""
    read -p "Would you like to configure VISARD monitoring now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Backup .env
        cp .env .env.backup
        
        # Update MONITORED_USERS
        if grep -q "^MONITORED_USERS=" .env; then
            sed -i 's/^MONITORED_USERS=.*/MONITORED_USERS=visard,VISARD/' .env
        else
            echo "MONITORED_USERS=visard,VISARD" >> .env
        fi
        
        echo "✅ VISARD monitoring configured"
        echo "📝 Backup saved to .env.backup"
    fi
fi

echo ""
echo "📊 Current Configuration:"
echo "------------------------"
grep "^PORT=" .env || echo "PORT=3000"
grep "^MONITORED_USERS=" .env || echo "MONITORED_USERS=(not set)"
grep "^KEYWORDS=" .env || echo "KEYWORDS=(not set)"

echo ""
echo "🚀 Starting Application..."
echo ""

# Check if already running
if pgrep -f "node.*index.js" > /dev/null; then
    echo "⚠️  Application is already running"
    echo ""
    read -p "Restart the application? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Restarting..."
        pkill -f "node.*index.js"
        sleep 2
        nohup node index.js > app.log 2>&1 &
        echo "✅ Application restarted"
    fi
else
    nohup node index.js > app.log 2>&1 &
    echo "✅ Application started"
fi

sleep 2

echo ""
echo "📱 Dashboard Access:"
echo "-------------------"
echo "Local:      http://localhost:3000/"
echo "Production: https://www.safebox.cfd/botm/"
echo ""
echo "📋 Quick Commands:"
echo "------------------"
echo "View logs:     tail -f app.log"
echo "Stop app:      pkill -f 'node.*index.js'"
echo "Restart:       bash setup-visard.sh"
echo ""
echo "✨ Setup Complete!"
echo ""
echo "💡 Tips:"
echo "   - Open the dashboard in your browser"
echo "   - Check connection status (should be green)"
echo "   - Messages from VISARD will appear automatically"
echo "   - Use 'Filtered Alerts' to search by keywords"
echo ""

#!/bin/bash

# Nginx Setup Script for Bot Monitor
# This script will help you set up Nginx for www.safebox.cfd/botm/***

echo "🔧 Nginx Setup for Bot Monitor"
echo "================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script needs to be run with sudo"
    echo "Please run: sudo bash setup-nginx.sh"
    exit 1
fi

# Step 1: Install Nginx if not already installed
echo "📦 Step 1: Checking Nginx installation..."
if ! command -v nginx &> /dev/null; then
    echo "Nginx not found. Installing..."
    apt update
    apt install -y nginx
    echo "✅ Nginx installed"
else
    echo "✅ Nginx is already installed"
fi

# Step 2: Check Nginx version
echo ""
echo "📋 Nginx version:"
nginx -v

# Step 3: Copy configuration file
echo ""
echo "📝 Step 2: Installing configuration..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CONFIG_SOURCE="$SCRIPT_DIR/nginx-botm.conf"
CONFIG_DEST="/etc/nginx/sites-available/botm"

if [ -f "$CONFIG_SOURCE" ]; then
    cp "$CONFIG_SOURCE" "$CONFIG_DEST"
    echo "✅ Configuration copied to $CONFIG_DEST"
else
    echo "❌ Configuration file not found: $CONFIG_SOURCE"
    exit 1
fi

# Step 4: Create symbolic link to enable site
echo ""
echo "🔗 Step 3: Enabling site..."
ln -sf "$CONFIG_DEST" /etc/nginx/sites-enabled/botm
echo "✅ Site enabled"

# Step 5: Remove default site if it exists (optional)
echo ""
read -p "❓ Remove default Nginx site? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f /etc/nginx/sites-enabled/default
    echo "✅ Default site removed"
fi

# Step 6: Test Nginx configuration
echo ""
echo "🧪 Step 4: Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Configuration test passed"
else
    echo "❌ Configuration test failed"
    echo "Please check the errors above and fix the configuration"
    exit 1
fi

# Step 7: Reload Nginx
echo ""
echo "🔄 Step 5: Reloading Nginx..."
systemctl reload nginx
echo "✅ Nginx reloaded"

# Step 8: Enable Nginx to start on boot
echo ""
echo "🚀 Step 6: Enabling Nginx on boot..."
systemctl enable nginx
echo "✅ Nginx enabled on boot"

# Step 9: Check Nginx status
echo ""
echo "📊 Nginx status:"
systemctl status nginx --no-pager -l

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Make sure your Node.js app is running (check PORT in .env)"
echo "2. Update the upstream port in /etc/nginx/sites-available/botm if needed"
echo "3. Configure your DNS to point www.safebox.cfd to this server"
echo "4. For HTTPS, run: sudo certbot --nginx -d safebox.cfd -d www.safebox.cfd"
echo ""
echo "🌐 Your app should be accessible at: http://www.safebox.cfd/botm/"

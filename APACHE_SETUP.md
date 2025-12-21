# 🌐 Apache Reverse Proxy Setup Guide

This guide will help you configure Apache to reverse proxy requests to your Telegram Monitor application running on port 3000.

## 📋 Prerequisites

1. Apache installed on your system
2. Your application running on port 3000
3. A domain name (optional, can use IP address)

## 🔧 Step 1: Enable Required Apache Modules

First, enable the necessary Apache modules:

```bash
# On Ubuntu/Debian
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel  # Required for WebSocket support (Socket.IO)
sudo a2enmod headers
sudo a2enmod rewrite

# Restart Apache to apply changes
sudo systemctl restart apache2
```

```bash
# On macOS (using Homebrew Apache)
# Edit httpd.conf and uncomment these lines:
LoadModule proxy_module lib/httpd/modules/mod_proxy.so
LoadModule proxy_http_module lib/httpd/modules/mod_proxy_http.so
LoadModule proxy_wstunnel_module lib/httpd/modules/mod_proxy_wstunnel.so
LoadModule headers_module lib/httpd/modules/mod_headers.so
LoadModule rewrite_module lib/httpd/modules/mod_rewrite.so

# Restart Apache
sudo apachectl restart
```

```bash
# On CentOS/RHEL
# Modules are usually enabled by default, but verify in httpd.conf
sudo systemctl restart httpd
```

## 🌍 Step 2: Configure Virtual Host

### Option A: Domain-based Configuration (Recommended)

Create a new virtual host configuration file:

**For Ubuntu/Debian:**
```bash
sudo nano /etc/apache2/sites-available/telegram-monitor.conf
```

**For CentOS/RHEL:**
```bash
sudo nano /etc/httpd/conf.d/telegram-monitor.conf
```

**For macOS:**
```bash
sudo nano /usr/local/etc/httpd/extra/httpd-vhosts.conf
```

Add the following configuration:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/telegram-monitor-error.log
    CustomLog ${APACHE_LOG_DIR}/telegram-monitor-access.log combined
    
    # Proxy settings
    ProxyPreserveHost On
    ProxyRequests Off
    
    # WebSocket support for Socket.IO
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://localhost:3000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*)           http://localhost:3000/$1 [P,L]
    
    # Regular HTTP proxy
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Headers for WebSocket
    <Location />
        ProxyPass http://localhost:3000/
        ProxyPassReverse http://localhost:3000/
        
        # CORS headers (if needed)
        Header set Access-Control-Allow-Origin "*"
        Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Header set Access-Control-Allow-Headers "Content-Type"
    </Location>
    
    # Socket.IO specific path
    <Location /socket.io/>
        ProxyPass http://localhost:3000/socket.io/
        ProxyPassReverse http://localhost:3000/socket.io/
        
        # WebSocket upgrade headers
        RequestHeader set X-Forwarded-Proto "http"
        RequestHeader set X-Forwarded-Port "80"
    </Location>
</VirtualHost>
```

### Option B: IP-based Configuration (No Domain)

If you don't have a domain, use this simpler configuration:

```apache
<VirtualHost *:80>
    ServerName your-server-ip
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/telegram-monitor-error.log
    CustomLog ${APACHE_LOG_DIR}/telegram-monitor-access.log combined
    
    # Proxy settings
    ProxyPreserveHost On
    ProxyRequests Off
    
    # WebSocket support for Socket.IO
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://localhost:3000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*)           http://localhost:3000/$1 [P,L]
    
    # Regular HTTP proxy
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
</VirtualHost>
```

### Option C: Subdirectory Configuration

If you want to run the app under a subdirectory (e.g., `http://your-domain.com/telegram-monitor/`):

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/telegram-monitor-error.log
    CustomLog ${APACHE_LOG_DIR}/telegram-monitor-access.log combined
    
    # Proxy settings
    ProxyPreserveHost On
    ProxyRequests Off
    
    # WebSocket support for Socket.IO
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/telegram-monitor/(.*)  ws://localhost:3000/$1 [P,L]
    
    # Regular HTTP proxy
    ProxyPass /telegram-monitor/ http://localhost:3000/
    ProxyPassReverse /telegram-monitor/ http://localhost:3000/
    
    # Socket.IO specific path
    <Location /telegram-monitor/socket.io/>
        ProxyPass http://localhost:3000/socket.io/
        ProxyPassReverse http://localhost:3000/socket.io/
    </Location>
</VirtualHost>
```

## 🔐 Step 3: SSL/HTTPS Configuration (Optional but Recommended)

For production, you should use HTTPS. Here's a configuration with SSL:

```apache
<VirtualHost *:443>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/your/certificate.crt
    SSLCertificateKeyFile /path/to/your/private.key
    SSLCertificateChainFile /path/to/your/chain.crt
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/telegram-monitor-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/telegram-monitor-ssl-access.log combined
    
    # Proxy settings
    ProxyPreserveHost On
    ProxyRequests Off
    
    # WebSocket support for Socket.IO (WSS)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://localhost:3000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*)           http://localhost:3000/$1 [P,L]
    
    # Regular HTTP proxy
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Headers for secure WebSocket
    <Location />
        ProxyPass http://localhost:3000/
        ProxyPassReverse http://localhost:3000/
        
        RequestHeader set X-Forwarded-Proto "https"
        RequestHeader set X-Forwarded-Port "443"
    </Location>
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>
```

## ✅ Step 4: Enable the Site and Restart Apache

**For Ubuntu/Debian:**
```bash
# Enable the site
sudo a2ensite telegram-monitor.conf

# Test configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

**For CentOS/RHEL:**
```bash
# Test configuration
sudo apachectl configtest

# Restart Apache
sudo systemctl restart httpd
```

**For macOS:**
```bash
# Test configuration
sudo apachectl configtest

# Restart Apache
sudo apachectl restart
```

## 🔥 Step 5: Configure Firewall (if applicable)

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 'Apache Full'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 🧪 Step 6: Test Your Configuration

1. **Start your Node.js application:**
   ```bash
   cd /Users/elnitish/Desktop/bot1
   npm start
   ```

2. **Access via Apache:**
   - If using domain: `http://your-domain.com`
   - If using IP: `http://your-server-ip`
   - If using subdirectory: `http://your-domain.com/telegram-monitor/`

3. **Check WebSocket connection:**
   - Open browser console (F12)
   - Look for Socket.IO connection messages
   - Should see "🌐 Dashboard connected" in your Node.js logs

## 🐛 Troubleshooting

### Issue: 502 Bad Gateway
**Solution:** Make sure your Node.js app is running on port 3000
```bash
# Check if app is running
lsof -i :3000
# or
netstat -tuln | grep 3000
```

### Issue: WebSocket connection fails
**Solution:** Verify mod_proxy_wstunnel is enabled
```bash
# Ubuntu/Debian
sudo a2enmod proxy_wstunnel
sudo systemctl restart apache2
```

### Issue: Permission denied
**Solution:** Check SELinux settings (CentOS/RHEL)
```bash
sudo setsebool -P httpd_can_network_connect 1
```

### Issue: Apache won't start
**Solution:** Check error logs
```bash
# Ubuntu/Debian
sudo tail -f /var/log/apache2/error.log

# CentOS/RHEL
sudo tail -f /var/log/httpd/error_log

# macOS
sudo tail -f /usr/local/var/log/httpd/error_log
```

## 📊 Monitoring

Check Apache access logs to see incoming requests:
```bash
# Ubuntu/Debian
sudo tail -f /var/log/apache2/telegram-monitor-access.log

# CentOS/RHEL
sudo tail -f /var/log/httpd/telegram-monitor-access.log
```

## 🎯 Production Checklist

- [ ] Enable HTTPS/SSL
- [ ] Configure proper firewall rules
- [ ] Set up log rotation
- [ ] Configure rate limiting (mod_evasive)
- [ ] Set up monitoring/alerts
- [ ] Use process manager (PM2) for Node.js app
- [ ] Configure automatic startup for both Apache and Node.js app

## 🚀 Using PM2 for Production (Recommended)

Keep your Node.js app running with PM2:

```bash
# Install PM2
npm install -g pm2

# Start your app
cd /Users/elnitish/Desktop/bot1
pm2 start index.js --name telegram-monitor

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

## 📝 Quick Reference

**Your application:** `http://localhost:3000`  
**Apache proxy:** `http://your-domain.com` → `http://localhost:3000`  
**WebSocket:** Automatically proxied via mod_proxy_wstunnel

---

**Need help?** Check the Apache error logs and your Node.js console output for detailed error messages.

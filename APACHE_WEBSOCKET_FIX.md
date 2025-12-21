# Apache WebSocket Configuration for vault.visad.co.uk

## Issue
WebSocket connection failing:
```
WebSocket connection to 'wss://vault.visad.co.uk/noti/socket.io/?EIO=4&transport=websocket' failed
```

## Solution: Configure Apache Reverse Proxy with WebSocket Support

### Step 1: Enable Required Apache Modules

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### Step 2: Update Apache VirtualHost Configuration

Edit your Apache configuration file (usually in `/etc/apache2/sites-available/`):

```bash
sudo nano /etc/apache2/sites-available/vault.visad.co.uk.conf
# Or if using cPanel:
# Edit via WHM → Apache Configuration → Include Editor
```

Add this configuration:

```apache
<VirtualHost *:443>
    ServerName vault.visad.co.uk
    
    # SSL Configuration (your existing SSL settings)
    SSLEngine on
    SSLCertificateFile /path/to/your/cert.crt
    SSLCertificateKeyFile /path/to/your/key.key
    SSLCertificateChainFile /path/to/your/chain.crt
    
    # WebSocket Support for /notify/ path
    <Location /notify/>
        # Enable WebSocket proxying
        RewriteEngine On
        RewriteCond %{HTTP:Upgrade} =websocket [NC]
        RewriteRule ^/notify/(.*)$ ws://localhost:3045/$1 [P,L]
        RewriteCond %{HTTP:Upgrade} !=websocket [NC]
        RewriteRule ^/notify/(.*)$ http://localhost:3045/$1 [P,L]
        
        # Proxy settings
        ProxyPass http://localhost:3045/
        ProxyPassReverse http://localhost:3045/
        
        # WebSocket headers
        ProxyPreserveHost On
        RequestHeader set X-Forwarded-Proto "https"
        RequestHeader set X-Forwarded-Port "443"
    </Location>
    
    # WebSocket upgrade headers
    <Location /notify/noti/socket.io/>
        RewriteEngine On
        RewriteCond %{HTTP:Upgrade} websocket [NC]
        RewriteCond %{HTTP:Connection} upgrade [NC]
        RewriteRule ^/notify/noti/socket.io/(.*)$ ws://localhost:3045/noti/socket.io/$1 [P,L]
        
        ProxyPass ws://localhost:3045/noti/socket.io/
        ProxyPassReverse ws://localhost:3045/noti/socket.io/
    </Location>
</VirtualHost>
```

### Step 3: Test and Reload Apache

```bash
# Test configuration
sudo apache2ctl configtest

# If OK, reload Apache
sudo systemctl reload apache2
```

---

## Option 2: Use cPanel Proxy Configuration (If on cPanel)

If you're using cPanel, you can configure the proxy via WHM:

### Via WHM (as root):

1. **Login to WHM**
2. Go to: **Service Configuration → Apache Configuration → Include Editor**
3. Select: **Pre VirtualHost Include** for your domain
4. Add:

```apache
# WebSocket support for vault.visad.co.uk
<IfModule mod_proxy.c>
    ProxyRequests Off
    ProxyPreserveHost On
    
    # WebSocket proxying
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /notify/(.*) ws://localhost:3045/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /notify/(.*) http://localhost:3045/$1 [P,L]
    
    ProxyPass /notify/ http://localhost:3045/
    ProxyPassReverse /notify/ http://localhost:3045/
</IfModule>
```

5. Click **Update** and **Rebuild Configuration**

---

## Option 3: Disable WebSocket Transport (Quick Workaround)

If you can't configure Apache right now, you can temporarily disable WebSocket and use long-polling instead.

Update `public/app.js`:

```javascript
// Change this:
const socket = io(window.location.origin, {
    path: socketPath,
    transports: ['websocket', 'polling']
});

// To this (polling only):
const socket = io(window.location.origin, {
    path: socketPath,
    transports: ['polling']  // Remove 'websocket'
});
```

**Note**: This works but is less efficient than WebSocket.

---

## Option 4: Access via HTTP (Development Only)

For testing, you can access the app directly via HTTP on port 3045:

```
http://vault.visad.co.uk:3045/
```

**Note**: This bypasses the proxy but requires opening port 3045 in your firewall.

---

## Verification

After configuring Apache, test the WebSocket connection:

### Test 1: Check Apache Modules

```bash
apache2ctl -M | grep -E 'proxy|rewrite|wstunnel'
```

Should show:
```
proxy_module (shared)
proxy_http_module (shared)
proxy_wstunnel_module (shared)
rewrite_module (shared)
```

### Test 2: Check Browser Console

Open https://vault.visad.co.uk/notify/ and check console:
- ✅ No WebSocket connection errors
- ✅ Connection status shows "Connected"

### Test 3: Network Tab

In DevTools → Network → WS (WebSocket):
- Should show successful WebSocket connection
- Status: 101 Switching Protocols

---

## Troubleshooting

### Error: Module proxy_wstunnel not found

```bash
# Install Apache WebSocket module
sudo apt-get install libapache2-mod-proxy-html
sudo a2enmod proxy_wstunnel
sudo systemctl restart apache2
```

### Error: Forbidden or 403

Check Apache error logs:
```bash
sudo tail -f /var/log/apache2/error.log
```

### Still Not Working?

Check if port 3045 is actually listening:
```bash
netstat -tlnp | grep 3045
# or
ss -tlnp | grep 3045
```

Check PM2 logs:
```bash
pm2 logs vault.visad.co.uk --lines 50
```

---

## Summary

**The issue**: Apache/cPanel proxy doesn't support WebSocket by default

**The fix**: Enable `mod_proxy_wstunnel` and configure WebSocket proxying

**Quick workaround**: Use polling-only transport (less efficient)

**Best solution**: Configure Apache properly for WebSocket support

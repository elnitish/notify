# Nginx Configuration Guide

This guide explains how to set up Nginx as a reverse proxy for your Telegram Bot Monitor application at `www.safebox.cfd/botm/***`.

## 📋 Prerequisites

1. A server with Ubuntu/Debian Linux
2. Root/sudo access
3. Domain `safebox.cfd` pointing to your server's IP address
4. Your Node.js application running (default port: 3000)

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

Run the automated setup script:

```bash
sudo bash setup-nginx.sh
```

This script will:
- Install Nginx (if not already installed)
- Copy the configuration file
- Enable the site
- Test and reload Nginx
- Enable Nginx to start on boot

### Option 2: Manual Setup

1. **Install Nginx:**
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Copy configuration:**
   ```bash
   sudo cp nginx-botm.conf /etc/nginx/sites-available/botm
   ```

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/botm /etc/nginx/sites-enabled/botm
   ```

4. **Remove default site (optional):**
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```

5. **Test configuration:**
   ```bash
   sudo nginx -t
   ```

6. **Reload Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

## ⚙️ Configuration Details

### Port Configuration

The default configuration assumes your Node.js app runs on port **3000**. If you're using a different port:

1. Check your `.env` file for the `PORT` variable
2. Edit `/etc/nginx/sites-available/botm`
3. Update the `upstream botm_backend` section:
   ```nginx
   upstream botm_backend {
       server 127.0.0.1:YOUR_PORT;  # Change to your port
       keepalive 64;
   }
   ```
4. Reload Nginx: `sudo systemctl reload nginx`

### Path Structure

The configuration sets up the following paths:

- `http://www.safebox.cfd/botm/` → Your app's root
- `http://www.safebox.cfd/botm/socket.io/` → WebSocket connections

All requests to `/botm/*` are proxied to your Node.js application with the `/botm` prefix removed.

## 🔒 SSL/HTTPS Setup (Recommended)

For production, you should enable HTTPS:

1. **Install Certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain SSL certificate:**
   ```bash
   sudo certbot --nginx -d safebox.cfd -d www.safebox.cfd
   ```

3. **Follow the prompts** to configure HTTPS

4. **Auto-renewal:** Certbot automatically sets up certificate renewal

Alternatively, uncomment the SSL server block in `nginx-botm.conf` and manually configure your certificates.

## 🧪 Testing

1. **Check Nginx status:**
   ```bash
   sudo systemctl status nginx
   ```

2. **Test your application:**
   ```bash
   curl http://www.safebox.cfd/botm/
   ```

3. **Check Nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Check Nginx access logs:**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   ```

## 🔧 Troubleshooting

### Application not accessible

1. **Verify Node.js app is running:**
   ```bash
   # Check if your app is running
   ps aux | grep node
   
   # Check if port 3000 is listening
   sudo netstat -tlnp | grep 3000
   ```

2. **Check Nginx configuration:**
   ```bash
   sudo nginx -t
   ```

3. **Restart services:**
   ```bash
   # Restart your Node.js app
   # (depends on how you're running it - PM2, systemd, etc.)
   
   # Restart Nginx
   sudo systemctl restart nginx
   ```

### WebSocket connection issues

1. Ensure the `/botm/socket.io/` location block is present
2. Check browser console for WebSocket errors
3. Verify firewall allows WebSocket connections

### DNS not resolving

1. **Check DNS configuration:**
   ```bash
   nslookup www.safebox.cfd
   dig www.safebox.cfd
   ```

2. **Verify A record** points to your server's IP

3. **Wait for DNS propagation** (can take up to 48 hours)

## 📁 File Locations

- **Configuration file:** `/etc/nginx/sites-available/botm`
- **Enabled site link:** `/etc/nginx/sites-enabled/botm`
- **Error logs:** `/var/log/nginx/error.log`
- **Access logs:** `/var/log/nginx/access.log`
- **Main Nginx config:** `/etc/nginx/nginx.conf`

## 🔄 Common Commands

```bash
# Test configuration
sudo nginx -t

# Reload Nginx (graceful, no downtime)
sudo systemctl reload nginx

# Restart Nginx (full restart)
sudo systemctl restart nginx

# Stop Nginx
sudo systemctl stop nginx

# Start Nginx
sudo systemctl start nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

## 🎯 Next Steps

1. ✅ Set up Nginx (you're here!)
2. 🔒 Configure SSL/HTTPS with Certbot
3. 🚀 Set up your Node.js app to run as a service (PM2 or systemd)
4. 📊 Configure monitoring and logging
5. 🔥 Set up a firewall (ufw)

## 📝 Notes

- The configuration includes WebSocket support for Socket.IO
- CORS is handled by your Express app
- The `/botm` prefix is automatically removed when forwarding to your app
- Long-lived WebSocket connections are supported (7-day timeout)

## 🆘 Need Help?

If you encounter issues:
1. Check the logs: `/var/log/nginx/error.log`
2. Verify your Node.js app is running
3. Ensure the port in the Nginx config matches your app's port
4. Check firewall settings
5. Verify DNS configuration

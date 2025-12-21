## 🔧 Troubleshooting Guide

Your Telegram monitor is having issues connecting. Here's how to fix it:

### Problem
The MTProto client connects to Telegram servers but hangs when trying to authenticate with the session string.

### Solution: Regenerate Session String

1. **Stop the current process:**
   ```bash
   pkill -f "node index.js"
   ```

2. **Generate a new session string:**
   ```bash
   node generate-session.js
   ```

3. **Follow the prompts:**
   - Enter your phone number (with country code, e.g., `+919876543210`)
   - Enter the code sent to your Telegram app
   - If you have 2FA, enter your password

4. **Copy the session string** that appears

5. **Update `.env` file:**
   - Open `.env`
   - Replace the `SESSION_STRING=...` line with your new session string
   - Save the file

6. **Start the monitor:**
   ```bash
   node index.js
   ```

### Expected Output

You should see:
```
✅ Connected to Telegram!
👂 Listening for messages from monitored users...
👤 Logged in as: Your Name (@username)
```

### Test the Monitor

Ask Deepak Jose to send a NEW message (after the bot starts) containing one of these keywords:
- LONDON_GERMANY
- visa
- appointment
- slot

You'll see the alert in the terminal and on the dashboard at http://localhost:3000

### Note
The monitor only captures NEW messages sent AFTER it starts. It doesn't read message history.

---

## 🌐 Web Dashboard Issues

### Problem: 502 Bad Gateway & "io is not defined"

If you see these errors in your browser console when accessing the dashboard:
- `Failed to load resource: the server responded with a status of 502 (Bad Gateway)`
- `Uncaught ReferenceError: io is not defined`

This means the Socket.IO client library isn't loading.

### Solution: Check Nginx Configuration

1. **Verify the Node.js server is running:**
   ```bash
   ps aux | grep "node index.js"
   netstat -tlnp | grep :3000
   ```

2. **Test locally (should return 200 OK):**
   ```bash
   curl -I http://localhost:3000/noti/socket.io/socket.io.js
   ```

3. **Test through Nginx:**
   ```bash
   curl -I https://www.safebox.cfd/noti/socket.io/socket.io.js
   ```

4. **If you get 502, check Nginx has the `/noti/socket.io/` location block:**
   ```bash
   sudo nano /etc/nginx/sites-available/safebox.cfd
   ```

   Make sure this block exists:
   ```nginx
   location /noti/socket.io/ {
       proxy_pass http://127.0.0.1:3000/noti/socket.io/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       # ... other headers
   }
   ```

5. **Reload Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

For detailed explanation, see: `502_FIX_SOCKET_IO.md`

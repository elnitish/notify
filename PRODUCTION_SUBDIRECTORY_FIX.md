# 🚀 Production Deployment Fix - Subdirectory Support

## Issue on vault.visad.co.uk

When accessing the app at `https://vault.visad.co.uk/notify/`, you were getting:

```
❌ GET https://vault.visad.co.uk/noti/socket.io/socket.io.js net::ERR_ABORTED 404 (Not Found)
❌ Uncaught ReferenceError: io is not defined
```

## Root Cause

The app was trying to load Socket.IO from the **root path** instead of the **subdirectory path**:
- ❌ Loading from: `https://vault.visad.co.uk/noti/socket.io/socket.io.js`
- ✅ Should load from: `https://vault.visad.co.uk/notify/noti/socket.io/socket.io.js`

## What Was Fixed

1. **Changed Socket.IO script to relative path** in `index.html`
   - Before: `<script src="/noti/socket.io/socket.io.js">`
   - After: `<script src="noti/socket.io/socket.io.js">`

2. **Auto-detect base path** in `app.js`
   - Automatically detects if app is running in a subdirectory
   - Works for both `/` (root) and `/notify/` (subdirectory) deployments

## 📥 Deploy to Production Server

### Quick Deploy (One Command)

SSH into your production server and run:

```bash
cd /home/visadcouk/vault.visad.co.uk/notify && git pull origin master && pm2 restart vault.visad.co.uk && pm2 logs vault.visad.co.uk --lines 20
```

### Step-by-Step Deploy

```bash
# 1. SSH into production server
ssh visadcouk@your-server

# 2. Navigate to project directory
cd /home/visadcouk/vault.visad.co.uk/notify

# 3. Pull latest changes
git pull origin master

# 4. Restart the app
pm2 restart vault.visad.co.uk

# 5. Check logs
pm2 logs vault.visad.co.uk --lines 20
```

## ✅ Verify the Fix

### Test 1: Check Socket.IO Loads

Open your browser and go to:
```
https://vault.visad.co.uk/notify/
```

Open the browser console (F12) and check:
- ✅ No 404 errors
- ✅ No "io is not defined" errors
- ✅ Connection status shows "Connected"

### Test 2: Check in Browser Console

Run this in the browser console:
```javascript
console.log('Socket.IO path:', socket.io.opts.path);
```

Should output:
```
Socket.IO path: /notify/noti/socket.io
```

### Test 3: Network Tab

1. Open DevTools → Network tab
2. Reload the page
3. Look for `socket.io.js` request
4. Should show: `200 OK` from `https://vault.visad.co.uk/notify/noti/socket.io/socket.io.js`

## 🔧 How It Works Now

The app automatically detects its deployment path:

```javascript
// If URL is: https://vault.visad.co.uk/notify/
// basePath = '/notify'
// socketPath = '/notify/noti/socket.io'

// If URL is: https://vault.visad.co.uk/
// basePath = ''
// socketPath = '/noti/socket.io'
```

This means the **same code works for both**:
- ✅ Root deployment: `https://www.safebox.cfd/botm/`
- ✅ Subdirectory deployment: `https://vault.visad.co.uk/notify/`

## 📝 Important Notes

### This Fix Handles:
- ✅ Subdirectory deployments (e.g., `/notify/`)
- ✅ Root deployments (e.g., `/`)
- ✅ Any subdirectory path automatically
- ✅ No configuration needed

### No Changes Needed For:
- ❌ Node.js server code (index.js)
- ❌ Environment variables (.env)
- ❌ PM2 configuration
- ❌ Port settings

### Only Frontend Changed:
- ✅ `public/index.html` - Relative script path
- ✅ `public/app.js` - Auto-detect base path

## 🚨 Still Getting Errors?

### Error: AUTH_KEY_DUPLICATED

If you see this error in PM2 logs:
```
❌ Failed to connect: RPCError: 406: AUTH_KEY_DUPLICATED
```

You need to generate a **new session string** on the production server:

```bash
# 1. Stop the app
pm2 stop vault.visad.co.uk

# 2. Generate new session
cd /home/visadcouk/vault.visad.co.uk/notify
node generate-session.js

# 3. Update .env with new session string
nano .env
# Replace SESSION_STRING=... with the new one

# 4. Restart
pm2 restart vault.visad.co.uk
```

### Error: Port Already in Use

```bash
# Check what's using port 3045
lsof -i :3045

# Kill the process if needed
pm2 delete vault.visad.co.uk
pm2 start index.js --name vault.visad.co.uk
```

## 📊 Expected Output

After deployment, PM2 logs should show:

```
0|vault.visad.co.uk  | ✅ Connected to Telegram!
0|vault.visad.co.uk  | 👂 Listening for messages from monitored users...
0|vault.visad.co.uk  | 👤 Logged in as: Your Name (@username)
0|vault.visad.co.uk  | 🌐 Web server running on http://localhost:3045
```

Browser should show:
- ✅ Dashboard loads at `https://vault.visad.co.uk/notify/`
- ✅ "Connected" status in sidebar (green)
- ✅ No console errors
- ✅ Real-time updates working

---

## 🎯 Summary

**What to do on production server:**

```bash
cd /home/visadcouk/vault.visad.co.uk/notify
git pull origin master
pm2 restart vault.visad.co.uk
```

**Then test:**
- Open: https://vault.visad.co.uk/notify/
- Check: Connection status = "Connected" ✅

---

**Commit**: `998896f` - fix: Support subdirectory deployment  
**Files Changed**: `public/index.html`, `public/app.js`  
**Deployment Time**: ~30 seconds  
**Downtime**: None (PM2 graceful restart)

# 🚀 Production Deployment Guide

## Changes Pushed to Git

The following fixes have been committed and pushed to the repository:

### Files Modified:
- ✅ `safebox.cfd.conf` - Added `/noti/socket.io/` location block
- ✅ `TROUBLESHOOTING.md` - Added web dashboard troubleshooting section
- ✅ `502_FIX_SOCKET_IO.md` - Comprehensive fix documentation (NEW)
- ✅ `FIX_SUMMARY.md` - Quick reference card (NEW)

### Commit Message:
```
Fix: Add Nginx location block for /noti/socket.io/ to resolve 502 error
```

---

## 📥 How to Pull on Production Server

### Step 1: Connect to Production Server

```bash
ssh your-username@your-production-server
# Or if you're already on the server, skip this step
```

### Step 2: Navigate to Project Directory

```bash
cd /home/elnitish/bot_m
```

### Step 3: Check Current Status

```bash
# See what branch you're on and if there are uncommitted changes
git status
```

### Step 4: Stash Any Local Changes (if needed)

If you have uncommitted changes that you want to keep:
```bash
git stash
```

### Step 5: Pull Latest Changes

```bash
git pull origin master
```

You should see output like:
```
remote: Enumerating objects: 9, done.
remote: Counting objects: 100% (9/9), done.
remote: Compressing objects: 100% (4/4), done.
remote: Total 6 (delta 2), reused 6 (delta 2), pack-reused 0
Unpacking objects: 100% (6/6), done.
From https://github.com/elnitish/notify
   b1f2899..96617e8  master     -> origin/master
Updating b1f2899..96617e8
Fast-forward
 502_FIX_SOCKET_IO.md  | 234 +++++++++++++++++++++++++++++++++++++++++
 FIX_SUMMARY.md        |  41 ++++++++
 TROUBLESHOOTING.md    |  54 ++++++++++
 safebox.cfd.conf      |  19 ++++
 4 files changed, 322 insertions(+)
 create mode 100644 502_FIX_SOCKET_IO.md
 create mode 100644 FIX_SUMMARY.md
```

### Step 6: Apply Stashed Changes (if you stashed in Step 4)

```bash
git stash pop
```

---

## 🔧 Update Nginx Configuration

After pulling the changes, you need to update the Nginx configuration:

### Step 1: Backup Current Nginx Config

```bash
sudo cp /etc/nginx/sites-available/safebox.cfd /etc/nginx/sites-available/safebox.cfd.backup-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Copy Updated Config to Nginx

```bash
sudo cp /home/elnitish/bot_m/safebox.cfd.conf /etc/nginx/sites-available/safebox.cfd
```

### Step 3: Test Nginx Configuration

```bash
sudo nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 4: Reload Nginx

```bash
sudo systemctl reload nginx
```

---

## ✅ Verify the Fix

### Test 1: Check Socket.IO Endpoint

```bash
curl -I https://www.safebox.cfd/noti/socket.io/socket.io.js
```

Expected: `HTTP/1.1 200 OK`

### Test 2: Check All Endpoints

```bash
echo "=== Testing All Endpoints ===" && \
curl -s -o /dev/null -w "1. Main Page: %{http_code}\n" https://www.safebox.cfd/botm/ && \
curl -s -o /dev/null -w "2. Socket.IO: %{http_code}\n" https://www.safebox.cfd/noti/socket.io/socket.io.js && \
curl -s -o /dev/null -w "3. App JS: %{http_code}\n" https://www.safebox.cfd/botm/app.js && \
curl -s -o /dev/null -w "4. CSS: %{http_code}\n" https://www.safebox.cfd/botm/style.css
```

All should return `200`

### Test 3: Check Browser Console

1. Open: https://www.safebox.cfd/botm/
2. Open browser console (F12)
3. Verify:
   - ✅ No "502 Bad Gateway" errors
   - ✅ No "io is not defined" errors
   - ✅ Connection status shows "Connected"

---

## 🔄 Complete Deployment Script

Here's a one-liner to do everything (run on production server):

```bash
cd /home/elnitish/bot_m && \
git pull origin master && \
sudo cp /etc/nginx/sites-available/safebox.cfd /etc/nginx/sites-available/safebox.cfd.backup-$(date +%Y%m%d-%H%M%S) && \
sudo cp /home/elnitish/bot_m/safebox.cfd.conf /etc/nginx/sites-available/safebox.cfd && \
sudo nginx -t && \
sudo systemctl reload nginx && \
echo "" && \
echo "=== Deployment Complete ===" && \
echo "" && \
echo "Testing endpoints..." && \
curl -s -o /dev/null -w "Socket.IO: %{http_code}\n" https://www.safebox.cfd/noti/socket.io/socket.io.js && \
echo "" && \
echo "✅ Done! Visit: https://www.safebox.cfd/botm/"
```

---

## 🚨 Troubleshooting

### If `git pull` fails with conflicts:

```bash
# See what files have conflicts
git status

# Option 1: Keep your local changes
git stash
git pull origin master
git stash pop

# Option 2: Discard local changes (CAREFUL!)
git reset --hard origin/master
```

### If Nginx test fails:

```bash
# Check syntax errors
sudo nginx -t

# View error details
sudo tail -20 /var/log/nginx/error.log

# Restore backup
sudo cp /etc/nginx/sites-available/safebox.cfd.backup-YYYYMMDD-HHMMSS /etc/nginx/sites-available/safebox.cfd
sudo nginx -t
sudo systemctl reload nginx
```

### If Node.js server is not running:

```bash
# Check if running
ps aux | grep "node index.js"

# If not running, start it
cd /home/elnitish/bot_m
node index.js

# Or use PM2 if installed
pm2 restart bot_m
# or
pm2 start index.js --name bot_m
```

---

## 📝 Notes

- **No need to restart Node.js** - This fix only updates Nginx configuration
- **Zero downtime** - `systemctl reload nginx` is graceful
- **Backups created** - Original config is backed up automatically
- **Safe to run multiple times** - The script is idempotent

---

## 📚 Documentation

After deployment, review these files for details:
- `502_FIX_SOCKET_IO.md` - Full explanation of the fix
- `FIX_SUMMARY.md` - Quick reference
- `TROUBLESHOOTING.md` - Updated troubleshooting guide

---

**Repository**: https://github.com/elnitish/notify  
**Latest Commit**: `96617e8` - Fix: Add Nginx location block for /noti/socket.io/  
**Deployment Date**: 2025-12-21

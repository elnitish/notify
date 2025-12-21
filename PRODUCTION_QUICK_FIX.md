## 🚀 QUICK FIX - Production Server (vault.visad.co.uk)

### ❌ The Problem
```
GET https://vault.visad.co.uk/noti/socket.io/socket.io.js 
net::ERR_ABORTED 404 (Not Found)

Uncaught ReferenceError: io is not defined
```

### ✅ The Solution
Updated the app to auto-detect subdirectory paths.

---

## 📥 Deploy Now (Copy & Paste)

SSH into your production server and run this **ONE COMMAND**:

```bash
cd /home/visadcouk/vault.visad.co.uk/notify && git pull origin master && pm2 restart vault.visad.co.uk && echo "✅ Deployment Complete! Check: https://vault.visad.co.uk/notify/"
```

---

## 🔍 Verify It Works

1. **Open in browser**: https://vault.visad.co.uk/notify/
2. **Check sidebar**: Should show "Connected" (green) ✅
3. **Open console (F12)**: No errors ✅

---

## 📝 What Changed

- ✅ Socket.IO now uses relative paths
- ✅ Auto-detects if running in subdirectory
- ✅ Works for both `/` and `/notify/` deployments
- ✅ No server-side changes needed

---

## 🚨 Still Have Issues?

### Issue 1: AUTH_KEY_DUPLICATED Error

```bash
pm2 stop vault.visad.co.uk
node generate-session.js
# Follow prompts, then update .env with new session string
nano .env
pm2 restart vault.visad.co.uk
```

### Issue 2: Check Logs

```bash
pm2 logs vault.visad.co.uk --lines 50
```

Should see:
```
✅ Connected to Telegram!
👂 Listening for messages...
🌐 Web server running on http://localhost:3045
```

---

**Commit**: `998896f` - Subdirectory deployment fix  
**Full Guide**: See `PRODUCTION_SUBDIRECTORY_FIX.md`

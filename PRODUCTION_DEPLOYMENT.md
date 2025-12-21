# 🚀 Production Deployment Guide

## Deploy Database Integration to vault.visad.co.uk

---

## 📋 Step-by-Step Deployment

### **Step 1: SSH to Production Server**

```bash
ssh elnitish@vault.visad.co.uk
# or use your SSH key/credentials
```

---

### **Step 2: Navigate to Project Directory**

```bash
cd /home/elnitish/bot_m
# or wherever your project is located
```

---

### **Step 3: Pull Latest Changes**

```bash
# Pull from GitHub
git pull origin master

# You should see:
# - db.js (new)
# - index.js (modified)
# - public/app.js (modified)
# - public/index.html (modified)
# - package.json (modified)
# - .gitignore (modified)
# - Documentation files (new)
```

---

### **Step 4: Install New Dependencies**

```bash
npm install

# This will install better-sqlite3
# May take 1-2 minutes to compile native modules
```

---

### **Step 5: Stop Current Server**

**If using PM2:**
```bash
pm2 stop bot_m
# or
pm2 stop all
```

**If using npm start directly:**
```bash
# Find the process
ps aux | grep "node index.js"

# Kill it
kill <PID>
```

**If using screen/tmux:**
```bash
# Attach to session
screen -r bot_m
# or
tmux attach -t bot_m

# Press Ctrl+C to stop
```

---

### **Step 6: Start Server**

**Option A: Using PM2 (Recommended)**
```bash
pm2 start index.js --name bot_m
pm2 save
pm2 startup  # Enable auto-start on reboot
```

**Option B: Using npm start**
```bash
npm start
```

**Option C: Using screen (background)**
```bash
screen -S bot_m
npm start
# Press Ctrl+A then D to detach
```

---

### **Step 7: Verify Database Initialization**

Check the logs for these messages:

```
✅ Database initialized with WAL mode
📁 Database location: /home/elnitish/bot_m/notifications.db
✅ Database tables and indexes created
💾 Database ready
🌐 Web server running on http://localhost:3045
```

**If using PM2:**
```bash
pm2 logs bot_m
```

---

### **Step 8: Verify Database Files Created**

```bash
ls -lh notifications.db*

# You should see 3 files:
# notifications.db       (main database)
# notifications.db-wal   (WAL mode active!)
# notifications.db-shm   (shared memory)
```

---

### **Step 9: Test API Endpoints**

```bash
# Test from production server
curl http://localhost:3045/api/notifications?limit=10

# Should return JSON:
# {"notifications":[],"total":0,"hasMore":false}

# Test stats endpoint
curl http://localhost:3045/api/stats

# Should return:
# {"total":0,"today":0,"thisWeek":0,"byKeyword":[],"topSenders":[],"oldestMessage":null}
```

---

### **Step 10: Test from Browser**

Open your dashboard:
```
https://vault.visad.co.uk/notify/
```

**Expected behavior:**
1. Page loads (may show "Loading messages...")
2. If no messages yet: Shows empty state
3. Console shows: `✅ Loaded 0 messages from database`
4. Socket.IO connects: Status shows "Connected"

---

### **Step 11: Test Real-time + Persistence**

1. **Send a test Telegram message** from VISARD bot

2. **Check server logs:**
   ```bash
   pm2 logs bot_m --lines 50
   
   # Should see:
   # 📨 Message from: "VISARD" (visard)
   # 💾 Saved to DB (ID: 1)
   ```

3. **Check dashboard:**
   - Message appears instantly ✅
   - Sound plays (if enabled) ✅

4. **Refresh the page:**
   - Message still appears ✅
   - Loaded from database! ✅

---

## 🔧 Troubleshooting

### **Issue: Port Already in Use**

```bash
# Find what's using the port
lsof -i :3045

# Kill the process
kill <PID>

# Restart
pm2 restart bot_m
```

---

### **Issue: Database Permission Error**

```bash
# Check permissions
ls -l notifications.db*

# Fix if needed
chmod 644 notifications.db*
chown elnitish:elnitish notifications.db*
```

---

### **Issue: better-sqlite3 Installation Fails**

```bash
# Install build tools (if needed)
sudo apt update
sudo apt install build-essential python3

# Reinstall
npm install better-sqlite3 --build-from-source
```

---

### **Issue: Telegram Session Error**

```bash
# Generate new session for production
node generate-session.js

# Update .env with new SESSION_STRING
nano .env

# Restart server
pm2 restart bot_m
```

---

## 📊 Monitoring

### **Check Server Status**

```bash
# PM2 status
pm2 status

# View logs
pm2 logs bot_m

# Monitor in real-time
pm2 monit
```

---

### **Check Database Size**

```bash
# View database file sizes
du -h notifications.db*

# Count messages
sqlite3 notifications.db "SELECT COUNT(*) FROM notifications;"
```

---

### **View Recent Messages**

```bash
sqlite3 notifications.db "SELECT id, sender, timestamp FROM notifications ORDER BY timestamp DESC LIMIT 10;"
```

---

## 🔄 Rollback (If Needed)

If something goes wrong:

```bash
# Go back to previous commit
git log --oneline  # Find previous commit hash
git reset --hard <previous-commit-hash>

# Reinstall old dependencies
npm install

# Restart
pm2 restart bot_m
```

---

## ✅ Success Checklist

- [ ] SSH to production server
- [ ] Navigate to project directory
- [ ] Pull latest changes (`git pull`)
- [ ] Install dependencies (`npm install`)
- [ ] Stop current server
- [ ] Start server (PM2 recommended)
- [ ] Verify database files created (3 files)
- [ ] Test API endpoints (curl)
- [ ] Open dashboard in browser
- [ ] Send test Telegram message
- [ ] Verify message saved to DB (check logs)
- [ ] Verify message appears in UI
- [ ] Refresh page - message persists ✅

---

## 🎯 Quick Commands Reference

```bash
# Pull and deploy
cd /home/elnitish/bot_m
git pull origin master
npm install
pm2 restart bot_m

# Check status
pm2 status
pm2 logs bot_m

# Test API
curl http://localhost:3045/api/notifications
curl http://localhost:3045/api/stats

# View database
ls -lh notifications.db*
sqlite3 notifications.db "SELECT COUNT(*) FROM notifications;"

# Monitor
pm2 monit
```

---

## 📝 Post-Deployment

After successful deployment:

1. **Monitor for 10-15 minutes** to ensure stability
2. **Send a few test messages** to verify everything works
3. **Check database is growing** (`ls -lh notifications.db`)
4. **Verify no errors in logs** (`pm2 logs bot_m`)

---

## 🎉 Done!

Your production server now has:
- ✅ SQLite database with WAL mode
- ✅ Persistent notification storage
- ✅ Real-time updates via Socket.IO
- ✅ API endpoints for management
- ✅ Historical data on page load

**Everything should work seamlessly!** 🚀

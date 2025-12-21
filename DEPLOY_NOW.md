# 🚀 QUICK DEPLOYMENT GUIDE

## Deploy to Production Server (vault.visad.co.uk)

---

## Option 1: Automated Deployment (Easiest) ⭐

### **Step 1: SSH to Production**
```bash
ssh elnitish@vault.visad.co.uk
```

### **Step 2: Navigate to Project**
```bash
cd /home/elnitish/bot_m
```

### **Step 3: Run Deployment Script**
```bash
./deploy-production.sh
```

**That's it!** The script will:
- Pull latest code
- Install dependencies
- Restart server
- Verify deployment
- Test API

---

## Option 2: Manual Deployment

### **Step 1: SSH to Production**
```bash
ssh elnitish@vault.visad.co.uk
```

### **Step 2: Navigate and Pull**
```bash
cd /home/elnitish/bot_m
git pull origin master
```

### **Step 3: Install Dependencies**
```bash
npm install
```

### **Step 4: Restart Server**

**If using PM2:**
```bash
pm2 restart bot_m
pm2 logs bot_m
```

**If using npm start:**
```bash
# Kill old process first
ps aux | grep "node index.js"
kill <PID>

# Start new
npm start
```

---

## ✅ Verify Deployment

### **1. Check Logs**
```bash
pm2 logs bot_m --lines 50
```

**Look for:**
```
✅ Database initialized with WAL mode
📁 Database location: /home/elnitish/bot_m/notifications.db
✅ Database tables and indexes created
💾 Database ready
🌐 Web server running on http://localhost:3045
```

### **2. Check Database Files**
```bash
ls -lh notifications.db*
```

**Should see 3 files:**
- notifications.db
- notifications.db-wal
- notifications.db-shm

### **3. Test API**
```bash
curl http://localhost:3045/api/notifications
curl http://localhost:3045/api/stats
```

### **4. Open Dashboard**
```
https://vault.visad.co.uk/notify/
```

### **5. Send Test Message**
- Send Telegram message from VISARD
- Check logs: `💾 Saved to DB (ID: 1)`
- Message appears in dashboard ✅
- Refresh page - message persists ✅

---

## 🔧 Troubleshooting

### **Issue: Git pull fails**
```bash
git stash  # Save local changes
git pull origin master
git stash pop  # Restore local changes
```

### **Issue: npm install fails**
```bash
# Install build tools
sudo apt update
sudo apt install build-essential python3
npm install
```

### **Issue: Port in use**
```bash
lsof -i :3045
kill <PID>
pm2 restart bot_m
```

### **Issue: Database permission error**
```bash
chmod 644 notifications.db*
chown elnitish:elnitish notifications.db*
```

---

## 📞 Need Help?

Check the detailed guides:
- `PRODUCTION_DEPLOYMENT.md` - Full deployment guide
- `DATABASE_QUICK_START.md` - Quick start guide
- `DATABASE_ARCHITECTURE.md` - Technical details

---

## 🎉 Success!

Once deployed, you'll have:
- ✅ Persistent notification storage
- ✅ Real-time updates
- ✅ Historical data
- ✅ High performance (2-3ms per message)
- ✅ No message loss

**Enjoy your new database-powered notification system!** 🎊

## 🚀 Quick Deploy Commands for Production Server

### Option 1: One-Line Deployment (Recommended)

Copy and paste this single command on your production server:

```bash
cd /home/elnitish/bot_m && git pull origin master && sudo cp /etc/nginx/sites-available/safebox.cfd /etc/nginx/sites-available/safebox.cfd.backup-$(date +%Y%m%d-%H%M%S) && sudo cp /home/elnitish/bot_m/safebox.cfd.conf /etc/nginx/sites-available/safebox.cfd && sudo nginx -t && sudo systemctl reload nginx && echo "✅ Deployment Complete!"
```

---

### Option 2: Step-by-Step Commands

If you prefer to run commands one at a time:

```bash
# 1. Navigate to project directory
cd /home/elnitish/bot_m

# 2. Pull latest changes
git pull origin master

# 3. Backup current Nginx config
sudo cp /etc/nginx/sites-available/safebox.cfd /etc/nginx/sites-available/safebox.cfd.backup-$(date +%Y%m%d-%H%M%S)

# 4. Update Nginx config
sudo cp /home/elnitish/bot_m/safebox.cfd.conf /etc/nginx/sites-available/safebox.cfd

# 5. Test Nginx config
sudo nginx -t

# 6. Reload Nginx
sudo systemctl reload nginx
```

---

### Verify Deployment

```bash
curl -I https://www.safebox.cfd/noti/socket.io/socket.io.js
```

Should return: **HTTP/1.1 200 OK** ✅

---

### What Got Updated?

- ✅ Nginx configuration (added `/noti/socket.io/` location block)
- ✅ Troubleshooting documentation
- ✅ Fix documentation and guides

### What You DON'T Need to Do

- ❌ No need to restart Node.js server
- ❌ No need to restart Nginx (reload is enough)
- ❌ No need to update environment variables
- ❌ No downtime required

---

**Repository**: https://github.com/elnitish/notify  
**Latest Commits**: 
- `96617e8` - Fix: Add Nginx location block for /noti/socket.io/
- `3b02e26` - docs: Add production deployment guide

**Full Guide**: See `DEPLOYMENT_GUIDE.md` for detailed instructions

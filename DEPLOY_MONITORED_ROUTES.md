# Production Deployment - Monitored Routes Tab

## Quick Deploy Instructions

### On Your Production Server

```bash
# 1. Navigate to your project directory
cd /path/to/bot_m

# 2. Pull the latest changes
git pull origin master

# 3. Restart the Node.js application
# Option A: If using PM2
pm2 restart bot_m

# Option B: If using systemd
sudo systemctl restart bot_m

# Option C: If running manually
# Stop the current process (Ctrl+C or kill the process)
# Then start again:
npm start

# 4. Clear browser cache and reload
# In your browser: Ctrl+Shift+R (hard reload)
```

## What Changed

- ✅ Added new "Monitored Routes" tab in navigation
- ✅ Routes now display in dedicated view
- ✅ Click any route card to auto-filter in VisaD Notify
- ✅ Badge shows total active routes count

## Verification Steps

1. **Check Navigation**: You should see 4 tabs now:
   - VisaD Notify
   - All Messages
   - **Monitored Routes** ← NEW
   - Country

2. **Test Routes Tab**: 
   - Click "Monitored Routes"
   - Should display all active routes from travelers.php
   - Each card shows country, visa center, and applicant count

3. **Test Auto-Filter**:
   - Click any route card
   - Should switch to "VisaD Notify" tab
   - Filter input should auto-populate with route details
   - Matching messages should appear

## Troubleshooting

### If routes don't load:
- Check browser console for API errors
- Verify `https://vault.visad.co.uk/api/travelers.php` is accessible
- Ensure CORS headers are configured correctly

### If tab doesn't appear:
- Clear browser cache completely
- Do a hard reload (Ctrl+Shift+R)
- Check that index.html was updated correctly

### If auto-filter doesn't work:
- Check browser console for JavaScript errors
- Verify you're clicking on a route card (not empty space)

## Git Commit Details

**Commit**: `5ec4fd7`  
**Message**: Add dedicated Monitored Routes tab with auto-filter functionality

**Files Changed**:
- `public/index.html` (+81 lines, -10 lines)

## Need Help?

If you encounter any issues during deployment, check:
1. Git pull completed successfully
2. No merge conflicts
3. Application restarted properly
4. Browser cache cleared

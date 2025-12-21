# VISARD Visa Slots Monitor - Admin Panel

## 🎯 Overview

Professional admin panel for monitoring visa slot availability messages from the VISARD Telegram bot. Built for visa consulting companies to track and filter visa appointment slots in real-time.

## ✨ Features

### 📬 All Messages View
- Real-time feed of all messages from VISARD bot
- Beautiful card-based layout with country flags
- Automatic parsing of:
  - Country and location
  - Slot type (Prime Time, Regular, etc.)
  - Available dates and times
  - Visa center links
- Color-coded cards:
  - **Orange border** = Prime Time slots
  - **Blue border** = Regular slots

### 🔍 Filtered Alerts View
- Filter messages by keywords (country, city, slot type)
- Multiple keyword support (comma-separated)
- Real-time filtering
- Active filter tags with easy removal
- Dedicated filtered message count

### ⚙️ Settings Panel
- Sound alerts toggle
- Desktop notifications (with permission)
- Auto-refresh toggle
- Compact mode for more messages
- Data export (JSON format)
- Clear all messages

### 📊 Statistics
- Total messages count
- Today's messages count
- Last update timestamp
- Real-time connection status

## 🚀 Setup Instructions

### 1. Configure Environment Variables

Edit your `.env` file to monitor VISARD bot:

```bash
# Telegram API Credentials
API_ID=your_api_id
API_HASH=your_api_hash
SESSION_STRING=your_session_string

# Server Configuration
PORT=3000

# Monitor VISARD bot specifically
MONITORED_USERS=visard,VISARD

# Optional: Keywords to highlight (leave empty to show all)
KEYWORDS=
```

### 2. Start the Application

```bash
npm start
```

### 3. Access the Dashboard

- **Local:** http://localhost:3000/
- **Production:** https://www.safebox.cfd/botm/

## 📱 How It Works

### Message Flow

1. **VISARD bot** sends visa slot messages to your Telegram
2. **MTProto client** (index.js) receives messages in real-time
3. **Backend filters** messages from VISARD bot only
4. **Socket.IO** broadcasts to connected dashboards
5. **Frontend parses** and displays in beautiful cards

### Message Parsing

The dashboard automatically extracts:

```
🇫🇷 France - Edinburgh          → Country: France, Location: Edinburgh
▶️ Prime Time                   → Slot Type: Prime Time
- 29.12.2025 - 07:30, 08:00    → Dates and times
Link to visa center site        → Booking link available
```

### Filtering

Enter keywords to filter messages:
- **Country:** `France`, `Germany`, `Iceland`
- **City:** `Edinburgh`, `London`
- **Slot Type:** `Prime Time`, `Regular`
- **Multiple:** `France, Edinburgh, Prime Time`

## 🎨 UI Features

### Modern Design
- Dark theme optimized for long monitoring sessions
- Smooth animations and transitions
- Responsive layout (desktop, tablet, mobile)
- Professional color scheme

### Interactive Elements
- Hover effects on cards
- New message pulse animation
- Copy message to clipboard
- Quick "Book Now" buttons
- Filter tag management

### Visual Indicators
- 🟢 Green dot = Connected to Telegram
- 🔴 Red dot = Disconnected
- ⭐ Orange border = Prime Time slots
- 📅 Blue border = Regular slots
- 🔔/🔕 Sound enabled/disabled

## 📋 Usage Guide

### Viewing All Messages

1. Click **"All Messages"** in sidebar (default view)
2. All VISARD messages appear in real-time
3. Newest messages at the top
4. Scroll to see older messages

### Filtering Messages

1. Click **"Filtered Alerts"** in sidebar
2. Enter keywords in the input field
3. Click **"Filter"** or press Enter
4. View only matching messages
5. Click **"Clear"** to reset filter

### Managing Data

**Export Data:**
- Click export button (📥) in sidebar or settings
- Downloads JSON file with all messages
- Filename: `visard-slots-[timestamp].json`

**Clear Messages:**
- Click trash button (🗑️) in sidebar
- Or go to Settings → Clear All Messages
- Confirmation required

### Settings Configuration

**Sound Alerts:**
- Toggle to enable/disable notification sounds
- Plays when new messages arrive

**Desktop Notifications:**
- Requires browser permission
- Shows system notifications for new slots

**Auto Refresh:**
- Keeps message list automatically updated
- Recommended: Keep enabled

**Compact Mode:**
- Shows more messages in less space
- Useful for monitoring many messages

## 🔧 Technical Details

### Frontend Stack
- **HTML5** - Semantic structure
- **CSS3** - Modern styling with CSS Grid/Flexbox
- **Vanilla JavaScript** - No framework dependencies
- **Socket.IO Client** - Real-time communication

### Backend Stack
- **Node.js** - Runtime environment
- **Express** - Web server
- **Socket.IO** - WebSocket server
- **Telegram MTProto** - Direct Telegram API

### Message Format

Messages are broadcast with this structure:

```javascript
{
  keyword: "ALL_MESSAGES",
  message: "Full message text...",
  group: "Chat name",
  sender: "VISARD",
  timestamp: 1703097600000,
  chatId: "123456789",
  isKeywordMatch: false
}
```

### Parsed Data Structure

```javascript
{
  country: "France",
  location: "Edinburgh",
  slotType: "Prime Time",
  flagEmoji: "🇫🇷",
  dates: [
    { date: "29.12.2025", times: "07:30, 08:00" },
    { date: "31.12.2025", times: "07:30, 08:00" }
  ],
  link: "Available"
}
```

## 🎯 Best Practices

### For Visa Consultants

1. **Keep dashboard open** during business hours
2. **Enable sound alerts** to catch new slots immediately
3. **Use filters** for specific client needs:
   - Client needs France visa → Filter: `France`
   - Client in Edinburgh → Filter: `Edinburgh`
   - Client wants Prime Time → Filter: `Prime Time`
4. **Export data** daily for record-keeping
5. **Clear old messages** weekly to maintain performance

### Filter Examples

```
France                          → All France slots
Edinburgh, Prime Time           → Prime Time slots in Edinburgh
Germany, London                 → German visa slots in London
Iceland, Short Stay             → Iceland short stay visas
France, Edinburgh, Regular      → Regular France slots in Edinburgh
```

## 🐛 Troubleshooting

### No Messages Appearing

1. Check connection status (green dot)
2. Verify VISARD is in `MONITORED_USERS` in `.env`
3. Check backend logs: `pm2 logs` or terminal output
4. Ensure VISARD bot is sending messages

### Connection Issues

1. Check if Node.js app is running
2. Verify port 3000 is not blocked
3. Check Nginx configuration
4. Review browser console for errors

### Filtering Not Working

1. Clear filter and reapply
2. Check keyword spelling
3. Try single keyword first
4. Refresh page

### Performance Issues

1. Clear old messages (Settings → Clear All)
2. Enable Compact Mode
3. Export and archive old data
4. Restart application

## 📊 Monitoring Tips

### Efficient Workflow

1. **Morning:** Clear yesterday's messages, start fresh
2. **During day:** Monitor "All Messages" view
3. **For clients:** Use "Filtered Alerts" with client-specific keywords
4. **Evening:** Export day's data for records

### Keyword Strategy

Create filters for:
- **High-demand countries:** France, Germany
- **Popular cities:** Edinburgh, London
- **Premium slots:** Prime Time
- **Client-specific:** Combine country + city + type

## 🔐 Security Notes

- Dashboard accessible only via configured domain
- HTTPS recommended for production
- No sensitive data stored in browser
- Session data in backend only
- Export files contain message text only

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review backend logs
3. Check browser console
4. Verify Telegram connection

## 🎉 Success Indicators

✅ Green connection dot  
✅ Messages appearing in real-time  
✅ Filters working correctly  
✅ Sound alerts playing  
✅ Statistics updating  
✅ Export functionality working  

---

**Version:** 1.0.0  
**Last Updated:** 2025-12-20  
**Dashboard URL:** https://www.safebox.cfd/botm/

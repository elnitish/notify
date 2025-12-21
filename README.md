# 📡 Telegram MTProto Monitor

Real-time Telegram message monitoring system with keyword filtering and web dashboard.

## 🚀 Features

- **MTProto Client** - Direct Telegram API access (no bot required)
- **Keyword Monitoring** - Filter messages by configurable keywords
- **Real-time Dashboard** - Beautiful web interface with live alerts
- **Multi-keyword Support** - Monitor multiple keywords simultaneously
- **Chat Information** - See sender, chat name, and full message
- **Export Data** - Download alert history as JSON
- **Sound Alerts** - Audio notifications for new alerts

## 📋 Setup Instructions

### 1. Add Your Session String

Run the session generator (you already did this):
```bash
node generate-session.js
```

Copy the session string and add it to `.env`:
```env
SESSION_STRING=your_actual_session_string_here
```

### 2. Configure Keywords

Edit `.env` to add keywords you want to monitor (comma-separated):
```env
KEYWORDS=LONDON_GERMANY,visa,appointment,slot,available
```

### 3. Start the Monitor

```bash
npm start
```

### 4. Open Dashboard

Open your browser to: **http://localhost:3000**

## 🎯 How It Works

1. **MTProto Connection** - Connects to Telegram using your session
2. **Message Listening** - Monitors ALL chats you have access to
3. **Keyword Filtering** - Checks each message for configured keywords
4. **Real-time Alerts** - Sends matching messages to web dashboard
5. **Dashboard Display** - Shows alerts with chat info, sender, and timestamp

## 📁 Project Structure

```
bot1/
├── index.js              # Main monitoring application
├── generate-session.js   # Session string generator
├── public/
│   ├── index.html       # Dashboard UI
│   ├── style.css        # Styling
│   └── app.js           # Client-side logic
├── .env                 # Configuration
└── package.json         # Dependencies
```

## ⚙️ Configuration (.env)

```env
# Telegram API Credentials
API_ID=your_api_id
API_HASH=your_api_hash

# Session String (from generate-session.js)
SESSION_STRING=your_session_string

# Keywords to Monitor (comma-separated)
KEYWORDS=LONDON_GERMANY,visa,appointment,slot

# Web Server Port
PORT=3000
```

## 🔍 What Gets Monitored?

The system monitors:
- ✅ All groups you're a member of
- ✅ All channels you're subscribed to
- ✅ All private chats
- ✅ Messages from bots
- ✅ Messages from users

## 🎨 Dashboard Features

- **Live Connection Status** - See if monitoring is active
- **Statistics** - Total alerts, today's count, last alert time
- **Alert Cards** - Each alert shows:
  - Matched keyword
  - Full message text
  - Chat/group name
  - Sender name
  - Timestamp
- **Controls**:
  - Clear history
  - Export data as JSON
  - Toggle sound alerts

## 🔒 Security Notes

- **Session String** - Keep your session string private! It's like a password
- **Never share** your `.env` file
- **Regenerate session** if compromised by running `generate-session.js` again

## 🛠️ Troubleshooting

### "Session string required" error
- Make sure you've added `SESSION_STRING` to `.env`
- Run `node generate-session.js` to get a new session

### No alerts appearing
- Check that keywords are configured in `.env`
- Verify the dashboard is connected (green status badge)
- Test by sending a message with the keyword in a chat

### Connection issues
- Check your internet connection
- Verify API_ID and API_HASH are correct
- Try regenerating your session string

## 📝 Example Usage

1. You want to monitor visa appointment slots
2. Add keywords: `KEYWORDS=appointment,slot,available,visa`
3. Start the monitor: `npm start`
4. Open dashboard: `http://localhost:3000`
5. When anyone mentions these keywords in any chat, you'll get instant alerts!

## 🎉 Enjoy Your Monitor!

Your Telegram monitoring system is now ready to catch important messages in real-time!
# notify

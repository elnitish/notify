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

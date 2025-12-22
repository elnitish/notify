import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import {
    initDatabase,
    saveNotification,
    getNotifications,
    getTotalCount,
    getNotificationsSince,
    getStats,
    clearAllNotifications,
    deleteOldNotifications
} from './db.js';

dotenv.config();

// Express & Socket.IO setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    path: "/noti/socket.io"
});

// Express middleware
app.use(express.json());

// API Endpoints
// Get all notifications with pagination
app.get('/api/notifications', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10000;
        const offset = parseInt(req.query.offset) || 0;

        const notifications = getNotifications(limit, offset);
        const total = getTotalCount();

        res.json({
            notifications,
            total,
            hasMore: (offset + limit) < total
        });
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get notifications since timestamp
app.get('/api/notifications/since/:timestamp', (req, res) => {
    try {
        const timestamp = parseInt(req.params.timestamp);
        const notifications = getNotificationsSince(timestamp);

        res.json({ notifications });
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get statistics
app.get('/api/stats', (req, res) => {
    try {
        const stats = getStats();
        res.json(stats);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get saved keywords/filters
app.get('/api/keywords', (req, res) => {
    try {
        // For now, return empty array - you can implement database storage later
        // Or read from a JSON file
        res.json({ keywords: [] });
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save keywords/filters
app.post('/api/keywords', (req, res) => {
    try {
        const { keywords } = req.body;
        // For now, just acknowledge - you can implement database storage later
        // Or save to a JSON file
        console.log('Keywords saved:', keywords);
        res.json({ success: true });
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save notification (POST)
app.post('/api/notifications', (req, res) => {
    try {
        const { message, keyword, sender, group, timestamp } = req.body;

        const notificationData = {
            keyword: keyword || 'Manual',
            message: message || '',
            group: group || 'Unknown',
            sender: sender || 'Unknown',
            chatId: 'manual',
            isKeywordMatch: false,
            timestamp: timestamp || Date.now()
        };

        const savedId = saveNotification(notificationData);
        res.json({ success: true, id: savedId });
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Clear all notifications
app.delete('/api/notifications', (req, res) => {
    try {
        const deletedCount = clearAllNotifications();
        res.json({ success: true, deletedCount });
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete old notifications
app.delete('/api/notifications/old', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const deletedCount = deleteOldNotifications(days);
        res.json({ success: true, deletedCount });
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.use(express.static("public"));

// MTProto setup
const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const sessionString = process.env.SESSION_STRING || "";
const stringSession = new StringSession(sessionString);

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

// Keywords to monitor (dynamic - can be updated from dashboard)
let keywords = process.env.KEYWORDS
    ? process.env.KEYWORDS.split(',').map(k => k.trim().toUpperCase())
    : ['LONDON_GERMANY'];

// Users to monitor (optional - if empty, monitors all users)
const monitoredUsers = process.env.MONITORED_USERS
    ? process.env.MONITORED_USERS.split(',').map(u => u.trim().toLowerCase())
    : [];

console.log('🔍 Initial keywords:', keywords);
if (monitoredUsers.length > 0) {
    console.log('👤 Monitoring specific users:', monitoredUsers);
} else {
    console.log('👥 Monitoring all users');
}

// Normalize text for matching
function normalize(text) {
    return text
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "");
}

// Check if message contains any keyword
function containsKeyword(text) {
    const normalized = normalize(text);
    return keywords.find(keyword =>
        normalized.includes(normalize(keyword))
    );
}

// Check if sender matches monitored users
function isMonitoredUser(senderName) {
    if (monitoredUsers.length === 0) return true; // Monitor all if no specific users set

    const normalizedSender = senderName.toLowerCase();
    return monitoredUsers.some(user =>
        normalizedSender.includes(user) || user.includes(normalizedSender)
    );
}

// Handle incoming messages
async function handleNewMessage(event) {
    try {
        const message = event.message;
        if (!message || !message.text) return;

        const text = message.text;

        // Get sender info first
        const sender = await message.getSender();
        const senderName = sender
            ? (sender.firstName || sender.username || 'Unknown')
            : 'Unknown';
        const senderFullName = sender
            ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.username || 'Unknown'
            : 'Unknown';

        // Check if sender is monitored (if user filtering is enabled)
        const isMonitored = isMonitoredUser(senderFullName) || isMonitoredUser(senderName);

        if (!isMonitored) {
            return; // Skip if not a monitored user
        }

        // Get chat info
        const chat = await message.getChat();
        const chatTitle = chat.title || chat.firstName || `Chat ${message.chatId}`;

        // Log ALL messages from monitored users
        console.log(`📨 Message from: "${senderFullName}" (${senderName})`);
        console.log(`   Chat: ${chatTitle}`);
        console.log(`   Text: ${text}\n`);

        // Check for keyword match
        const matchedKeyword = containsKeyword(text);

        // Create alert data for ALL messages from monitored users
        const alertData = {
            keyword: matchedKeyword || 'ALL_MESSAGES',
            message: text,
            group: chatTitle,
            sender: senderFullName,
            timestamp: Date.now(),
            chatId: message.chatId.toString(),
            isKeywordMatch: !!matchedKeyword
        };

        if (matchedKeyword) {
            console.log(`🔔 KEYWORD MATCH: ${matchedKeyword}\n`);
        }

        // Save to database FIRST (sequential approach)
        try {
            const savedId = saveNotification(alertData);
            console.log(`💾 Saved to DB (ID: ${savedId})`);
        } catch (error) {
            console.error('❌ Database save failed:', error);
            // Continue anyway - real-time still works
        }

        // THEN broadcast ALL messages from monitored users to dashboard
        io.emit('telegram-alert', alertData);

    } catch (error) {
        console.error('Error handling message:', error);
    }
}

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('🌐 Dashboard connected');

    // Send current keywords to dashboard
    socket.emit('keywords-update', keywords);

    // Handle keyword addition
    socket.on('add-keyword', (keyword) => {
        const normalizedKeyword = keyword.trim().toUpperCase();
        if (normalizedKeyword && !keywords.includes(normalizedKeyword)) {
            keywords.push(normalizedKeyword);
            console.log(`➕ Keyword added: ${normalizedKeyword}`);
            console.log(`🔍 Current keywords:`, keywords);
            // Broadcast to all connected dashboards
            io.emit('keywords-update', keywords);
        }
    });

    // Handle keyword removal
    socket.on('remove-keyword', (keyword) => {
        const normalizedKeyword = keyword.trim().toUpperCase();
        const index = keywords.indexOf(normalizedKeyword);
        if (index > -1) {
            keywords.splice(index, 1);
            console.log(`➖ Keyword removed: ${normalizedKeyword}`);
            console.log(`🔍 Current keywords:`, keywords);
            // Broadcast to all connected dashboards
            io.emit('keywords-update', keywords);
        }
    });

    // Handle get keywords request
    socket.on('get-keywords', () => {
        socket.emit('keywords-update', keywords);
    });

    socket.on('disconnect', () => {
        console.log('🌐 Dashboard disconnected');
    });
});

// Initialize database
initDatabase();

// Start server
server.listen(process.env.PORT, () => {
    console.log(`🌐 Web server running on http://localhost:${process.env.PORT}`);
});

// Start Telegram client
console.log('🚀 Starting Telegram MTProto client...');

client.connect().then(async () => {
    console.log('✅ Connected to Telegram!');

    // Add message listener immediately
    client.addEventHandler(handleNewMessage, new NewMessage({}));
    console.log('👂 Listening for messages from monitored users...\n');

    // Try to get user info (but don't fail if it hangs)
    setTimeout(async () => {
        try {
            const me = await client.getMe();
            console.log(`👤 Logged in as: ${me.firstName} ${me.lastName || ''} (@${me.username || 'no username'})`);
        } catch (e) {
            console.log('⚠️  Could not fetch user info, but monitoring is active');
        }
    }, 1000);

}).catch(err => {
    console.error('❌ Failed to connect:', err);
    console.log('💡 Try regenerating your session: node generate-session.js');
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down...');
    await client.disconnect();
    process.exit(0);
});
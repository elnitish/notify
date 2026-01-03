import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'notifications.db');

// Create/open database
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');  // Faster, still safe
db.pragma('cache_size = 10000');    // 10MB cache

console.log('✅ Database initialized with WAL mode');
console.log('📁 Database location:', dbPath);

// Create notifications table
db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT NOT NULL,
        message TEXT NOT NULL,
        group_name TEXT NOT NULL,
        sender TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        is_keyword_match INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// Create indexes for performance
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_timestamp ON notifications(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_keyword ON notifications(keyword);
    CREATE INDEX IF NOT EXISTS idx_is_keyword_match ON notifications(is_keyword_match);
    CREATE INDEX IF NOT EXISTS idx_created_at ON notifications(created_at DESC);
`);

console.log('✅ Database tables and indexes created');

// Save notification
export function saveNotification(data) {
    try {
        const stmt = db.prepare(`
            INSERT INTO notifications 
            (keyword, message, group_name, sender, chat_id, is_keyword_match, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        // Ensure all values are defined or safe defaults
        const result = stmt.run(
            data.keyword || 'Unknown',
            data.message || '',
            data.group || 'Unknown',
            data.sender || 'Unknown',
            data.chatId || 'manual',
            data.isKeywordMatch ? 1 : 0,
            data.timestamp || Date.now()
        );

        return result.lastInsertRowid;
    } catch (error) {
        console.error('❌ Database save error:', error);
        throw error;
    }
}

// Get notifications with pagination
export function getNotifications(limit = 100, offset = 0) {
    const stmt = db.prepare(`
        SELECT 
            id,
            keyword,
            message,
            group_name as "group",
            sender,
            chat_id as chatId,
            is_keyword_match as isKeywordMatch,
            timestamp,
            created_at as createdAt
        FROM notifications
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset);
}

// Get total count
export function getTotalCount() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM notifications');
    return stmt.get().count;
}

// Get notifications since timestamp
export function getNotificationsSince(timestamp) {
    const stmt = db.prepare(`
        SELECT 
            id,
            keyword,
            message,
            group_name as "group",
            sender,
            chat_id as chatId,
            is_keyword_match as isKeywordMatch,
            timestamp,
            created_at as createdAt
        FROM notifications
        WHERE timestamp > ?
        ORDER BY timestamp DESC
    `);

    return stmt.all(timestamp);
}

// Get statistics
export function getStats() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const total = db.prepare('SELECT COUNT(*) as count FROM notifications').get().count;
    const totalMatching = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_keyword_match = 1').get().count;
    const today = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE timestamp > ?').get(oneDayAgo).count;
    const thisWeek = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE timestamp > ?').get(oneWeekAgo).count;

    const byKeyword = db.prepare(`
        SELECT keyword, COUNT(*) as count 
        FROM notifications 
        GROUP BY keyword 
        ORDER BY count DESC 
        LIMIT 10
    `).all();

    const topSenders = db.prepare(`
        SELECT sender, COUNT(*) as count 
        FROM notifications 
        GROUP BY sender 
        ORDER BY count DESC 
        LIMIT 10
    `).all();

    const oldest = db.prepare('SELECT created_at FROM notifications ORDER BY timestamp ASC LIMIT 1').get();

    return {
        total,
        totalMatching,
        today,
        thisWeek,
        byKeyword,
        topSenders,
        oldestMessage: oldest?.created_at || null
    };
}

// Clear all notifications
export function clearAllNotifications() {
    const stmt = db.prepare('DELETE FROM notifications');
    const result = stmt.run();
    return result.changes;
}

// Delete old notifications
export function deleteOldNotifications(daysToKeep = 30) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const stmt = db.prepare('DELETE FROM notifications WHERE timestamp < ?');
    const result = stmt.run(cutoffTime);
    return result.changes;
}

// Initialize database
export function initDatabase() {
    console.log('💾 Database ready');
}

export default db;

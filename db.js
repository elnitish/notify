import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseMessage } from './messageParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'notifications_v2.db'); // Use new DB

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = 10000');

console.log('✅ Database initialized (v2 Normalized)');

// Helper: Get or Create ID (with cache for performance could be added later)
function getOrCreateId(table, col, val, extraCols = {}) {
    if (!val) val = 'Unknown';
    const row = db.prepare(`SELECT id FROM ${table} WHERE ${col} = ?`).get(val);
    if (row) return row.id;

    const cols = [col, ...Object.keys(extraCols)];
    const vals = [val, ...Object.values(extraCols)];
    const placeholders = cols.map(() => '?').join(',');

    const info = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`).run(...vals);
    return info.lastInsertRowid;
}

// Get or create center securely
function getOrCreateCenter(name, countryId) {
    const row = db.prepare('SELECT id FROM centers WHERE name = ? AND country_id = ?').get(name, countryId);
    if (row) return row.id;
    const info = db.prepare('INSERT INTO centers (name, country_id) VALUES (?, ?)').run(name, countryId);
    return info.lastInsertRowid;
}


export function saveNotification(data) {
    try {
        const text = data.message || '';

        // 1. Parse content
        const parsed = parseMessage(text);

        // 2. Get/Create IDs
        const senderId = getOrCreateId('senders', 'name', data.sender || 'Unknown');
        const groupId = getOrCreateId('groups', 'name', data.group || 'Unknown');
        const keywordId = getOrCreateId('keywords', 'word', data.keyword || 'Unknown');

        const countryId = getOrCreateId('countries', 'name', parsed.country);
        const centerId = getOrCreateCenter(parsed.center, countryId);

        // 3. Insert
        const stmt = db.prepare(`
            INSERT INTO notifications 
            (message, sender_id, group_id, keyword_id, country_id, center_id, chat_id, is_keyword_match, is_prime, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            text,
            senderId,
            groupId,
            keywordId,
            countryId,
            centerId,
            data.chatId || 'manual',
            data.isKeywordMatch ? 1 : 0,
            parsed.isPrime ? 1 : 0,
            data.timestamp || Date.now()
        );

        // 4. Update FTS
        db.prepare('INSERT INTO notifications_fts (rowid, message) VALUES (?, ?)').run(result.lastInsertRowid, text);

        return result.lastInsertRowid;
    } catch (error) {
        console.error('❌ Database save error:', error);
        throw error;
    }
}



// Optimized Get Notifications with Filtering support
export function getNotifications(limit = 100, offset = 0, filters = {}) {
    let query = `
        SELECT 
            n.id,
            k.word as keyword,
            n.message,
            g.name as "group",
            s.name as sender,
            n.chat_id as chatId,
            n.is_keyword_match as isKeywordMatch,
            n.timestamp,
            n.created_at as createdAt,
            c.name as country,
            cn.name as center,
            n.is_prime as isPrime
        FROM notifications n
        LEFT JOIN keywords k ON n.keyword_id = k.id
        LEFT JOIN groups g ON n.group_id = g.id
        LEFT JOIN senders s ON n.sender_id = s.id
        LEFT JOIN countries c ON n.country_id = c.id
        LEFT JOIN centers cn ON n.center_id = cn.id
        WHERE 1=1
    `;

    const params = [];

    // Add filters dynamically
    if (filters.country) {
        query += ` AND c.name LIKE ?`;
        params.push(`%${filters.country}%`);
    }

    if (filters.center) {
        query += ` AND cn.name LIKE ?`;
        params.push(`%${filters.center}%`);
    }

    if (filters.keyword) {
        query += ` AND k.word LIKE ?`;
        params.push(`%${filters.keyword}%`);
    }

    // Is Prime filter (if explicitly requested)
    if (filters.isPrime !== undefined && filters.isPrime !== null) {
        query += ` AND n.is_prime = ?`;
        params.push(filters.isPrime ? 1 : 0);
    }

    query += ` ORDER BY n.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
}

// Get notifications since timestamp
export function getNotificationsSince(timestamp) {
    const stmt = db.prepare(`
        SELECT 
            n.id,
            k.word as keyword,
            n.message,
            g.name as "group",
            s.name as sender,
            n.chat_id as chatId,
            n.is_keyword_match as isKeywordMatch,
            n.timestamp,
            n.created_at as createdAt,
            c.name as country,
            cn.name as center,
            n.is_prime as isPrime
        FROM notifications n
        LEFT JOIN keywords k ON n.keyword_id = k.id
        LEFT JOIN groups g ON n.group_id = g.id
        LEFT JOIN senders s ON n.sender_id = s.id
        LEFT JOIN countries c ON n.country_id = c.id
        LEFT JOIN centers cn ON n.center_id = cn.id
        WHERE n.timestamp > ?
        ORDER BY n.timestamp DESC
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
        SELECT k.word as keyword, COUNT(*) as count 
        FROM notifications n
        JOIN keywords k ON n.keyword_id = k.id
        GROUP BY k.word
        ORDER BY count DESC 
        LIMIT 10
    `).all();

    const topSenders = db.prepare(`
        SELECT s.name as sender, COUNT(*) as count 
        FROM notifications n
        JOIN senders s ON n.sender_id = s.id
        GROUP BY s.name
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

export function getTotalCount() {
    return db.prepare('SELECT COUNT(*) as count FROM notifications').get().count;
}

export function clearAllNotifications() {
    db.prepare('DELETE FROM notifications').run();
    db.prepare('DELETE FROM notifications_fts').run();
}

export function deleteOldNotifications(daysToKeep = 30) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const stmt = db.prepare('DELETE FROM notifications WHERE timestamp < ?');
    return stmt.run(cutoffTime).changes;
}

export function initDatabase() {
    console.log('✅ DB v2 is pre-initialized via migration.');
}

export default db;

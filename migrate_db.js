
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLD_DB_PATH = path.join(__dirname, 'notifications.db');
const NEW_DB_PATH = path.join(__dirname, 'notifications_v2.db');
const BACKUP_PATH = path.join(__dirname, `notifications_backup_${Date.now()}.db`);

// Copy current DB to backup
console.log('📦 Creating backup...');
fs.copyFileSync(OLD_DB_PATH, BACKUP_PATH);
console.log(`✅ Backup created at: ${BACKUP_PATH}`);

const oldDb = new Database(OLD_DB_PATH);
const newDb = new Database(NEW_DB_PATH);

// Enable WAL for speed
newDb.pragma('journal_mode = WAL');
newDb.pragma('synchronous = NORMAL');

console.log('🔄 Initializing new schema...');

// 1. Create Normalized Tables
newDb.exec(`
    CREATE TABLE IF NOT EXISTS senders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS countries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        code TEXT,
        flag TEXT
    );

    CREATE TABLE IF NOT EXISTS centers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        country_id INTEGER,
        FOREIGN KEY(country_id) REFERENCES countries(id),
        UNIQUE(name, country_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        sender_id INTEGER,
        group_id INTEGER,
        keyword_id INTEGER,
        country_id INTEGER,
        center_id INTEGER,
        chat_id TEXT,
        is_keyword_match INTEGER DEFAULT 0,
        is_prime INTEGER DEFAULT 0,
        timestamp INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES senders(id),
        FOREIGN KEY(group_id) REFERENCES groups(id),
        FOREIGN KEY(keyword_id) REFERENCES keywords(id),
        FOREIGN KEY(country_id) REFERENCES countries(id),
        FOREIGN KEY(center_id) REFERENCES centers(id)
    );

    -- FTS5 Virtual Table for full-text search
    CREATE VIRTUAL TABLE IF NOT EXISTS notifications_fts USING fts5(
        message, 
        content='notifications', 
        content_rowid='id'
    );
`);

console.log('✅ Schema created.');

// Pre-populate Countries (Static list from index.html + typical ones)
// We extract them dynamically during migration, but we can seed some if needed.
// For now, let's just rely on dynamic extraction to be safe and cover "Unknown".

// Helper to get or create ID
const getOrCreateId = (table, col, val, extraCols = {}) => {
    if (!val) val = 'Unknown';
    const row = newDb.prepare(`SELECT id FROM ${table} WHERE ${col} = ?`).get(val);
    if (row) return row.id;

    const cols = [col, ...Object.keys(extraCols)];
    const vals = [val, ...Object.values(extraCols)];
    const placeholders = cols.map(() => '?').join(',');

    const info = newDb.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`).run(...vals);
    return info.lastInsertRowid;
};

// Regex for parsing
// Matches: Optional Flag + Country Name + " - " + Center Name
const headerRegex = /(?:^|\n)(?:[^\w\s].*?)?\s*([A-Za-z\s]+?)\s*-\s*([A-Za-z\s]+)(?:\n|$)/;
const typeRegex = /▶️\s*(Regular|Prime)/i;

console.log('🚀 Starting migration...');

const allNotifications = oldDb.prepare('SELECT * FROM notifications').all();
let count = 0;

const insertStmt = newDb.prepare(`
    INSERT INTO notifications 
    (message, sender_id, group_id, keyword_id, country_id, center_id, chat_id, is_keyword_match, is_prime, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertFtsStmt = newDb.prepare(`
    INSERT INTO notifications_fts (rowid, message) VALUES (?, ?)
`);

const transaction = newDb.transaction((notifications) => {
    for (const note of notifications) {
        // 1. Get IDs for normalized fields
        const senderId = getOrCreateId('senders', 'name', note.sender);
        const groupId = getOrCreateId('groups', 'name', note.group_name);
        const keywordId = getOrCreateId('keywords', 'word', note.keyword);

        // 2. Parse Message Content
        let countryId = null;
        let centerId = null;
        let isPrime = 0;

        const content = note.message || '';

        // Parse Header for Country/Center
        const headerMatch = content.match(headerRegex);
        if (headerMatch) {
            const countryName = headerMatch[1].trim();
            const centerName = headerMatch[2].trim();

            countryId = getOrCreateId('countries', 'name', countryName);
            // Check if center exists for this country
            const centerRow = newDb.prepare('SELECT id FROM centers WHERE name = ? AND country_id = ?').get(centerName, countryId);
            if (centerRow) {
                centerId = centerRow.id;
            } else {
                const info = newDb.prepare('INSERT INTO centers (name, country_id) VALUES (?, ?)').run(centerName, countryId);
                centerId = info.lastInsertRowid;
            }
        }

        // Parse Prime status
        const typeMatch = content.match(typeRegex);
        if (typeMatch && typeMatch[1].toLowerCase().includes('prime')) {
            isPrime = 1;
        }

        // 3. Insert into new DB
        const result = insertStmt.run(
            note.message,
            senderId,
            groupId,
            keywordId,
            countryId, // Can be null
            centerId,  // Can be null
            note.chat_id,
            note.is_keyword_match,
            isPrime,
            note.timestamp,
            note.created_at
        );

        // 4. Update FTS Index
        insertFtsStmt.run(result.lastInsertRowid, note.message);

        count++;
        if (count % 1000 === 0) process.stdout.write(`.`);
    }
});

transaction(allNotifications);

console.log(`\n✅ Migrated ${count} notifications.`);

// Create Indexes on new DB
newDb.exec(`
    CREATE INDEX idx_timestamp ON notifications(timestamp DESC);
    CREATE INDEX idx_is_prime ON notifications(is_prime);
    CREATE INDEX idx_country_id ON notifications(country_id);
    CREATE INDEX idx_center_id ON notifications(center_id);
`);

console.log('✅ Indexes created.');
console.log('🎉 Migration complete! New DB at: notifications_v2.db');


import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'notifications_v2.db');

const db = new Database(DB_PATH);

console.log('🔄 Adding missing indices...');

try {
    // Add indices for foreign keys that were missing
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_keyword_id ON notifications(keyword_id);
        CREATE INDEX IF NOT EXISTS idx_sender_id ON notifications(sender_id);
        CREATE INDEX IF NOT EXISTS idx_group_id ON notifications(group_id);
    `);

    console.log('✅ Indices added successfully.');

    // Check indices
    const indices = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='notifications'").all();
    console.log('📊 Current Indices on notifications table:', indices.map(i => i.name));

} catch (error) {
    console.error('❌ Failed to add indices:', error);
}

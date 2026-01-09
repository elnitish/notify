
import db, { saveNotification, getNotifications, getStats } from './db.js';

console.log('🧪 Starting Verification...');

// 1. Test Insertion
const testMsg = `
🇫🇷 France - Paris
▶️ Prime Time
- 01.01.2026 - 10:00
`;

console.log('📝 Saving test notification...');
const id = saveNotification({
    message: testMsg,
    sender: 'VerifyBot',
    group: 'TestGroup',
    keyword: 'France',
    chatId: '12345',
    isKeywordMatch: true,
    timestamp: Date.now()
});

console.log(`✅ Saved with ID: ${id}`);

// 2. Test Retrieval
console.log('🔍 Retrieving notifications...');
const notifications = getNotifications(5);
const saved = notifications.find(n => n.id === id);

if (saved) {
    console.log('✅ Found saved notification:');
    console.log(`   - Country: ${saved.country} (Expected: France)`);
    console.log(`   - Center: ${saved.center} (Expected: Paris)`);
    console.log(`   - Is Prime: ${saved.isPrime} (Expected: 1)`);

    if (saved.country === 'France' && saved.center === 'Paris' && saved.isPrime === 1) {
        console.log('🎉 Parsing and Storage Verified!');
    } else {
        console.error('❌ Data mismatch!');
    }
} else {
    console.error('❌ Could not find saved notification');
}

// 3. Test Stats
const stats = getStats();
console.log('📊 Stats:', stats);

// 4. Test FTS (Direct Query)
console.log('🔎 Testing FTS...');
const ftsResult = db.prepare('SELECT rowid FROM notifications_fts WHERE message MATCH ?').all('France');
console.log(`   - FTS Matches for "France": ${ftsResult.length}`);

if (ftsResult.length > 0) {
    console.log('✅ FTS is working.');
} else {
    console.error('❌ FTS failed.');
}

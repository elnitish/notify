
import { getNotifications } from './db.js';

try {
    const messages = getNotifications(10);

    console.log('--- 📨 Top 10 Latest Messages ---');
    if (messages.length === 0) {
        console.log('No messages found in database.');
    }

    messages.forEach((msg, i) => {
        const time = new Date(msg.timestamp).toLocaleString();
        const type = msg.isPrime ? '🌟 PRIME' : '👤 Regular';
        const country = msg.country || 'Unknown';
        const center = msg.center || 'Unknown';

        console.log(`\n[${i + 1}] ${time} | ${country} - ${center} | ${type}`);
        // Show first line of message or trimmed content
        const preview = msg.message.split('\n').filter(l => l.trim().length > 0)[0] || msg.message;
        console.log(`    "${preview.substring(0, 80)}${preview.length > 80 ? '...' : ''}"`);
    });
    console.log('\n---------------------------------');

} catch (error) {
    console.error('Error fetching messages:', error);
}

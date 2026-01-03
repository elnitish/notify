import { getTotalCount } from './db.js';

try {
    const count = getTotalCount();
    console.log(`Total messages in database: ${count}`);
} catch (error) {
    console.error('Error checking count:', error);
}

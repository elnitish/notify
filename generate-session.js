import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import readlineSync from "readline-sync";
import dotenv from "dotenv";

dotenv.config();

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession("");

console.log('🔐 Telegram Session Generator\n');

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

await client.start({
    phoneNumber: async () => readlineSync.question("📱 Enter your phone number (with country code): "),
    password: async () => readlineSync.question("🔒 Enter your 2FA password (if enabled): "),
    phoneCode: async () => readlineSync.question("📲 Enter the code sent to Telegram: "),
    onError: (err) => console.error('❌ Error:', err),
});

const me = await client.getMe();
console.log(`\n✅ Successfully logged in as: ${me.firstName} ${me.lastName || ''}`);

const sessionString = client.session.save();
console.log('\n🔑 Your Session String:');
console.log('─'.repeat(80));
console.log(sessionString);
console.log('─'.repeat(80));
console.log('\n📝 Copy this session string and add it to your .env file:');
console.log(`SESSION_STRING=${sessionString}\n`);

await client.disconnect();
process.exit(0);

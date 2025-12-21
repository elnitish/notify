import { NewMessage } from "telegram/events";

const BOT_USERNAME = "VisaSlotBotUsername";

client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || !message.text) return;

    const sender = await message.getSender();
    if (sender?.username !== BOT_USERNAME) return;

    console.log("BOT MESSAGE:", message.text);
}, new NewMessage({}));
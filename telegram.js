const {
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID
} = process.env;

const TelegramBot = require('node-telegram-bot-api');
const telegramBot = TELEGRAM_BOT_TOKEN ? new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true }) : null;

const TELEGRAM_BOT_ENABLED = telegramBot && TELEGRAM_CHAT_ID;
const TELEGRAM_CHAT_IDS = TELEGRAM_CHAT_ID ? TELEGRAM_CHAT_ID.split(',') : [];

async function initCommands() {
    await telegramBot.deleteMyCommands()
    await telegramBot.setMyCommands([{
        command: 'earnings',
        description: 'Get earnings'
    }])
    telegramBot.onText(/\/earnings/, async (msg) => {
        console.log(msg)
        await telegramBot.sendMessage(msg.chat.id, `Here are your earnings: (TODO: implement)`)
    });
}
const trySendTelegramMessage = async (message = undefined) => {
    if (!TELEGRAM_BOT_ENABLED || !message) return;
    for (const chatId of TELEGRAM_CHAT_IDS) {
        let success = false
        let retries = 0
        while (!success && retries < 5) {
            try {
                await telegramBot.sendMessage(chatId, message)
                success = true
            } catch (err) {
                console.log(err)
                retries++
            }
        }
    }
};

module.exports = {
    TELEGRAM_BOT_ENABLED,
    TELEGRAM_CHAT_IDS,
    trySendTelegramMessage,
    initCommands
}

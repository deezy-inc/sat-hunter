const {
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID
} = process.env;

const TelegramBot = require('node-telegram-bot-api');
const { get_payment_details } = require('./commands');
const telegramBot = TELEGRAM_BOT_TOKEN ? new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true }) : null;

const TELEGRAM_BOT_ENABLED = telegramBot && TELEGRAM_CHAT_ID;
const TELEGRAM_CHAT_IDS = TELEGRAM_CHAT_ID ? TELEGRAM_CHAT_ID.split(',') : [];

async function initCommands() {
    await telegramBot.deleteMyCommands()
    await telegramBot.setMyCommands([{
        command: 'limits',
        description: 'Get current limits and payment info'
    }])
    telegramBot.onText(/\/limits/, async (msg) => {

        const chatId = msg.chat.id

        const { payment_details, payment_address } = await get_payment_details()

        if (!payment_details) {
            await telegramBot.sendMessage(chatId, "You have not set a payment address yet.")
            return
        }

        await telegramBot.sendMessage(chatId, payment_details, { parse_mode: 'HTML' })
        await telegramBot.sendMessage(chatId, payment_address)
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
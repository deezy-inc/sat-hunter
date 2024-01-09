const {
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID
} = process.env;

const TelegramBot = require('node-telegram-bot-api');
const { get_payment_details, create_withdraw_request } = require('../commands');
const telegramBot = TELEGRAM_BOT_TOKEN ? new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true }) : null;

const TELEGRAM_BOT_ENABLED = telegramBot && TELEGRAM_CHAT_ID;
const TELEGRAM_CHAT_IDS = TELEGRAM_CHAT_ID ? TELEGRAM_CHAT_ID.split(',') : [];

async function initCommands() {
    if (!TELEGRAM_BOT_ENABLED) return;
    await telegramBot.deleteMyCommands()
    await telegramBot.setMyCommands([{
        command: 'limits',
        description: 'Get current limits and payment info'
    },
    {
        command: 'withdraw',
        description: 'Create a new withdrawal request (denominated in sats)'
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
    telegramBot.onText(/\/withdraw (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
    
        // Extracting name and amount from the command
        const args = match[1].split(' ');
        if (args.length < 2) {
            await telegramBot.sendMessage(chatId, "Usage: /withdraw [name] [amount]");
            return;
        }
    
        const name = args[0];
        const amount = parseFloat(args[1]);
    
        if (isNaN(amount) || amount <= 1) {
            await telegramBot.sendMessage(chatId, "Please enter a valid amount in satoshis.");
            return;
        }
    
        try {
            // Call your create_withdraw_request function
            const { withdrawal_details } = await create_withdraw_request(name, amount);
            await telegramBot.sendMessage(chatId, withdrawal_details, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Error processing withdrawal request:', error);
            await telegramBot.sendMessage(chatId, "An error occurred while processing your request.");
        }
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
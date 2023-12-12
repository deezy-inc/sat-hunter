const TelegramBot = require('node-telegram-bot-api')
if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('You must set TELEGRAM_BOT_TOKEN in the .env file')
}
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })

console.log(`Send a message in Telegram to your bot to receive the TELEGRAM_CHAT_ID`)

bot.on('message', (msg) => {
    const chatId = msg.chat.id
    console.log(`Received message from Telegram! Add the following to your .env:`)
    console.log(`TELEGRAM_CHAT_ID=${chatId}`)
    bot.sendMessage(chatId, `Welcome to Deezy\'s Sat Hunter Bot. Hope you're ready to hunt down some rare sats :)`)
})
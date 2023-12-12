const {
  trySendTelegramMessage,
  initCommands,
  TELEGRAM_BOT_ENABLED
} = require('./telegram');

const {
  trySendPushover,
  PUSHOVER_ENABLED
} = require('./pushover');

const sendNotifications = async (message = undefined) => {
  await trySendPushover(message);
  await trySendTelegramMessage(message);
};

const initNotifications = async () => {
  if (TELEGRAM_BOT_ENABLED) {
    console.log(`Telegram bot is enabled`)
    await initCommands()
  }
  if (PUSHOVER_ENABLED) console.log(`Pushover bot is enabled`)
  await sendNotifications(`Starting up sat hunter on ${process.env.ACTIVE_EXCHANGE}`)
};

module.exports = {
  sendNotifications,
  initNotifications
};
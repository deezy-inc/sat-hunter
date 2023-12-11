const {
  trySendTelegramMessage,
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

module.exports = {
  sendNotifications,
  TELEGRAM_BOT_ENABLED,
  PUSHOVER_ENABLED
};
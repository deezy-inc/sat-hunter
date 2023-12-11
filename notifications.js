const {
  trySendTelegramMessage
} = require('./telegram');

const {
  trySendPushover
} = require('./pushover');

const sendNotifications = async (message = undefined) => {
  await trySendPushover(message);
  await trySendTelegramMessage(message);
};

module.exports = {
  sendNotifications
};
const {
  trySendTelegramMessage,
  initCommands,
  TELEGRAM_BOT_ENABLED
} = require('./telegram');

const {
  trySendPushover,
  PUSHOVER_ENABLED
} = require('./pushover');
const { getVersionMessage } = require('../utils');

const lastSentMessages = new Map();

const sendNotifications = async (message = undefined, type = undefined, uid = undefined) => {
  // Check if the type is provided and get the last message of that type
  if (type && lastSentMessages.has(type)) {
      const lastMsg = lastSentMessages.get(type);

      // Check if the uid is defined and compare it
      if (uid && lastMsg.uid === uid) {
          // If they are equal, do not send the message
          return Error(`Message already sent for ${type} ${uid}`);
      } else if (message === lastMsg.message && !uid) {
          // If the message is the same and no uid was provided, do not send it
          return Error(`Message already sent for ${type}`);
      }
  }

  // Proceed to send the message
  if (message) {
      await trySendPushover(message);
      await trySendTelegramMessage(message);
      // Update the last sent message for this type
      if (type) {
        lastSentMessages.set(type, { message, uid });
      }
  }
};

const initNotifications = async () => {
  if (TELEGRAM_BOT_ENABLED) {
    console.log(`Telegram bot is enabled`)
    await initCommands()
  }
  if (PUSHOVER_ENABLED) console.log(`Pushover bot is enabled`)
  await sendNotifications(`Starting up sat hunter on ${process.env.ACTIVE_EXCHANGE}`)
};

/**
 * Sends notifications about the version message
 * @param interval Timeout in milliseconds, default is 24 hours
 * @returns {Promise<void>}
 */
const initVersionCheck = async (interval = 1000 * 60 * 60 * 24) => {
    console.log('Checking version...')
    console.log(await getVersionMessage());

    const runPeriodicVersionCheck = async () => {
        const message = await getVersionMessage();
        await sendNotifications(message, 'version_check');
    }

    await runPeriodicVersionCheck();
    setInterval(runPeriodicVersionCheck, interval);
};

module.exports = {
    initVersionCheck,
    sendNotifications,
    initNotifications
};
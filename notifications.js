const {
  PUSHOVER_USER,
  PUSHOVER_TOKEN,
  PUSHOVER_PRIORITY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID
} = process.env;

const axios = require('axios');

const TelegramBot = require('node-telegram-bot-api');
const telegramBot = TELEGRAM_BOT_TOKEN ? new TelegramBot(TELEGRAM_BOT_TOKEN) : null;

const PUSHOVER_ENABLED = PUSHOVER_USER && PUSHOVER_TOKEN;
const PUSHOVER_ENDPOINT = 'https://api.pushover.net/1/messages.json';
const PUSHOVER_DEFAULT_PRIORITY = 0;
const TELEGRAM_BOT_ENABLED = telegramBot && TELEGRAM_CHAT_ID;
const TELEGRAM_CHAT_IDS = TELEGRAM_CHAT_ID.split(',');

const trySendPushover = async (message = undefined) => {
  if(!PUSHOVER_ENABLED || !message) return;
  const priority = PUSHOVER_PRIORITY ?? PUSHOVER_DEFAULT_PRIORITY;
  const headers = { 'Content-Type': 'application/json' };
  await axios.post(PUSHOVER_ENDPOINT, {
    token: PUSHOVER_TOKEN,
    user: PUSHOVER_USER,
    message,
    priority
  }, { headers });
};

const trySendTelegram = async (message = undefined) => {
  if(!TELEGRAM_BOT_ENABLED || !message) return;
  for (const chatId of TELEGRAM_CHAT_IDS) {
    await telegramBot.sendMessage(chatId, message);
  }
};


const sendNotifications = async (message = undefined) => {
  await trySendPushover(message);
  await trySendTelegram(message);
};

module.exports = {
  PUSHOVER_ENABLED,
  TELEGRAM_BOT_ENABLED,
  sendNotifications
};
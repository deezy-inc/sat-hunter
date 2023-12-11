process.env.TELEGRAM_BOT_ENABLED = 'true';
process.env.TELEGRAM_BOT_TOKEN = 'test_token';

const telegram = require('./../telegram');
const TelegramBot = require('node-telegram-bot-api');

jest.mock('node-telegram-bot-api');
jest.mock('./../commands');

describe('telegram', () => {
    let mockBot;

    beforeEach(() => {
        mockBot = {
            deleteMyCommands: jest.fn(),
            setMyCommands: jest.fn(),
            onText: jest.fn(),
            sendMessage: jest.fn(),
        };
        TelegramBot.mockImplementation(() => mockBot);
        process.env.TELEGRAM_BOT_TOKEN = 'test_token';
        process.env.TELEGRAM_CHAT_ID = 'test_chat_id';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should not send a message if TELEGRAM_BOT_ENABLED is false', async () => {
        delete process.env.TELEGRAM_BOT_TOKEN;
        await telegram.trySendTelegramMessage('test message');
        expect(mockBot.sendMessage).not.toHaveBeenCalled();
    });

    it('should not send a message if message is undefined', async () => {
        await telegram.trySendTelegramMessage();
        expect(mockBot.sendMessage).not.toHaveBeenCalled();
    });
});
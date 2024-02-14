const axios = require('axios');
const { get_btc_balance } = require('../../exchanges/coinbase-exchange');
const { env } = require('../../env');

jest.mock('axios');

describe('coinbase-exchange', () => {
    describe('get_btc_balance', () => {
        beforeEach(() => {
            jest.resetModules();
            env.COINBASE_EXCHANGE_API_KEY = 'COINBASE_EXCHANGE_API_KEY';
            env.COINBASE_EXCHANGE_API_SECRET = 'COINBASE_EXCHANGE_API_SECRET';
            env.COINBASE_EXCHANGE_API_PASSPHRASE = 'COINBASE_EXCHANGE_API_PASSPHRASE';
        });

        describe('Environment variables', () => {
            test.each([
                ['COINBASE_EXCHANGE_API_KEY'],
                ['COINBASE_EXCHANGE_API_SECRET'],
                ['COINBASE_EXCHANGE_API_PASSPHRASE'],
            ])('should throw exception if %p is not defined', async (environmentVariable) => {
                // Given
                const expectedError = new Error(`${environmentVariable} must be set`);

                // When
                delete env[environmentVariable];

                // Then
                await expect(get_btc_balance()).rejects.toEqual(expectedError);
            });
        });

        describe('Parsing available balance', () => {
            test.each([
                ['250.445545554', 250.44554555],
                ['250.445545555', 250.44554555],
                ['250.445545556', 250.44554555],
                ['250.445', 250.445],
                ['250', 250],
                ['0', 0],
            ])('should parse %p to %p', async (inputValue, expectedValue) => {
                // Given
                axios.get.mockImplementation((path) => {
                    if (path.endsWith('/accounts')) {
                        return Promise.resolve({ data: [{ currency: 'BTC', id: 'account-id' }] });
                    }

                    if (path.endsWith('/accounts/account-id')) {
                        return Promise.resolve({ data: { available: inputValue } });
                    }

                    return Promise.reject({});
                });

                // Then
                expect(await get_btc_balance()).toBe(expectedValue);
            });
        });
    });
});
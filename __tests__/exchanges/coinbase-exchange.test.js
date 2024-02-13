const coinbaseExchange = require('../../exchanges/coinbase-exchange');
const { get_btc_balance } = coinbaseExchange;

describe('coinbase-exchange', () => {
    describe('get_btc_balance', () => {
        describe('Environment variables configuration', () => {
            beforeEach(() => {
                jest.resetModules();
                process.env = {
                    COINBASE_EXCHANGE_API_KEY: 'COINBASE_EXCHANGE_API_KEY',
                    COINBASE_EXCHANGE_API_SECRET: 'COINBASE_EXCHANGE_API_SECRET',
                    COINBASE_EXCHANGE_API_PASSPHRASE: 'COINBASE_EXCHANGE_API_PASSPHRASE',
                };
            });

            test.each([
                ['COINBASE_EXCHANGE_API_KEY'],
                ['COINBASE_EXCHANGE_API_SECRET'],
                ['COINBASE_EXCHANGE_API_PASSPHRASE'],
            ])('should throw exception if missing %i environment variable', async (environmentVariable) => {
                // Given
                const expectedError = new Error('COINBASE_EXCHANGE_API_KEY, COINBASE_EXCHANGE_API_SECRET, and COINBASE_EXCHANGE_API_PASSPHRASE must be set');

                // When
                delete process.env[environmentVariable];

                // Then
                await expect(get_btc_balance()).rejects.toEqual(expectedError);
            });
        });
    });
});
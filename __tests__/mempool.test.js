describe('mempool', () => {
    beforeEach(() => {
        jest.resetAllMocks()
        jest.resetModules()
    })

    it('should create a mempool client', () => {
        const { getMempoolClient } = require('../utils/mempool');
        expect(getMempoolClient()).toBeTruthy()
    })

    it('mempool client should have MEMPOOL_URL as baseURL', () => {
        // Given
        process.env.MEMPOOL_URL = 'https://mempool-url.space'

        // Then
        const { getMempoolClient } = require('../utils/mempool');
        expect(getMempoolClient().defaults.baseURL).toBe(process.env.MEMPOOL_URL)
    })

    it('mempool client should use MEMPOOL_RETRY_URL and return first error when request fails', async () => {
        // Given
        const endpoint = '/api/not-existing-endpoint';
        process.env.MEMPOOL_URL = 'https://mempool-url.space'
        process.env.MEMPOOL_RETRY_URL = 'https://mempool-retry-url.space'
        const { getMempoolClient } = require('../utils/mempool');
        const mempoolClient = getMempoolClient()
        const consoleErrorSpy = jest.spyOn(global.console, 'error')

        // When
        try {
            await mempoolClient.get(endpoint);
        } catch (error) {
            // first request to MEMPOOL_URL
            expect(error.message).toBe('getaddrinfo ENOTFOUND mempool-url.space')
            // first request console error to MEMPOOL_URL
            expect(consoleErrorSpy).toHaveBeenNthCalledWith(1, `Attempted call with URL ${process.env.MEMPOOL_URL}${endpoint} failed: getaddrinfo ENOTFOUND mempool-url.space`);
            // second request console error to MEMPOOL_RETRY_URL
            expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, `Attempted 1 call(s) with URL ${process.env.MEMPOOL_RETRY_URL}${endpoint} failed: getaddrinfo ENOTFOUND mempool-retry-url.space`);
        }
    })

    it('mempool client should use MEMPOOL_RETRY_URL as retry for 3 times when MEMPOOL_RETRY_ATTEMPTS is 3', async () => {
        // Given
        const endpoint = '/api/not-existing-endpoint';
        process.env.MEMPOOL_URL = 'https://mempool-url.space'
        process.env.MEMPOOL_RETRY_URL = 'https://mempool-retry-url.space'
        process.env.MEMPOOL_RETRY_ATTEMPTS = 3
        const { getMempoolClient } = require('../utils/mempool');
        const mempoolClient = getMempoolClient()
        const consoleErrorSpy = jest.spyOn(global.console, 'error')

        // When
        try {
            await mempoolClient.get(endpoint);
        } catch (error) {
            // first request to MEMPOOL_URL
            expect(consoleErrorSpy).toHaveBeenCalledTimes(4)
            expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, `Attempted 1 call(s) with URL ${process.env.MEMPOOL_RETRY_URL}${endpoint} failed: getaddrinfo ENOTFOUND mempool-retry-url.space`);
            expect(consoleErrorSpy).toHaveBeenNthCalledWith(3, `Attempted 2 call(s) with URL ${process.env.MEMPOOL_RETRY_URL}${endpoint} failed: getaddrinfo ENOTFOUND mempool-retry-url.space`);
            expect(consoleErrorSpy).toHaveBeenNthCalledWith(4, `Attempted 3 call(s) with URL ${process.env.MEMPOOL_RETRY_URL}${endpoint} failed: getaddrinfo ENOTFOUND mempool-retry-url.space`);
        }
    })
})
describe('mempool', () => {
    describe('real tests', () => {
        const { getMempoolClient } = require('../utils/mempool')
        let mempoolClient = getMempoolClient()

        it('should create a mempool client', () => {
            expect(mempoolClient).toBeTruthy()
        })

        describe('configuration', () => {
            it('should have baseUrl equal to https://mempool.space', () => {
                expect(mempoolClient.defaults.baseURL).toEqual('https://mempool.space')
            })

            it('should have 1 response interceptor', () => {
                expect(mempoolClient.interceptors.response.handlers).toHaveLength(1)
            })
        })

        describe('functionality', () => {
            it('should return status 404 when unknown api is called', async () => {
                try {
                    await mempoolClient.get('/api/v1/unknown')
                } catch (error) {
                    console.log(error)
                    expect(error.response.status).toBe(404)
                }
            })

            it('should return status 200 when /api/v1/fees/recommended is called', async () => {
                expect.assertions(1)

                const response = await mempoolClient.get('/api/v1/fees/recommended')
                expect(response.status).toBe(200)
            })

            // eslint-disable-next-line max-len
            it('should return status 200 and data.activity when /api/activity is called and MEMPOOL_RETRY_URL=https://www.boredapi.com (unknown endpoint for https://mempool.space, but known for https://www.boredapi.com)', async () => {
                // Given
                expect.assertions(2)

                // When
                jest.resetModules()
                process.env.MEMPOOL_RETRY_URL = 'https://www.boredapi.com'
                mempoolClient = require('../utils/mempool').getMempoolClient()

                // Then
                const response = await mempoolClient.get('/api/activity')
                expect(response.data.activity).toBeTruthy()
                expect(response.status).toBe(200)
            })

            // eslint-disable-next-line max-len
            it('should return status 404 and no data.activity when /api/activity is called and MEMPOOL_RETRY_URL is default (unknown endpoint for https://mempool.space, but known for https://www.boredapi.com)', async () => {
                // Given
                expect.assertions(2)

                // When
                jest.resetModules()
                process.env.MEMPOOL_RETRY_URL = undefined
                mempoolClient = require('../utils/mempool').getMempoolClient()

                // Then
                try {
                    const response = await mempoolClient.get('/api/activity')
                } catch (error) {
                    expect(error.response.data?.activity).toBeFalsy()
                    expect(error.response.status).toBe(404)
                }
            })
        })
    })

    describe('mocked tests', () => {
        beforeEach(() => {
            jest.resetAllMocks()
            jest.resetModules()
        })

        it('should create a mempool client', () => {
            const { getMempoolClient } = require('../utils/mempool')
            expect(getMempoolClient()).toBeTruthy()
        })

        it('mempool client should have MEMPOOL_URL as baseURL', () => {
            // Given
            process.env.MEMPOOL_URL = 'https://mempool-url.space'

            // Then
            const { getMempoolClient } = require('../utils/mempool')
            expect(getMempoolClient().defaults.baseURL).toBe(process.env.MEMPOOL_URL)
        })

        it('mempool client should use MEMPOOL_RETRY_URL and return first error when request fails', async () => {
            // Given
            const endpoint = '/api/not-existing-endpoint'
            process.env.MEMPOOL_URL = 'https://mempool-url.space'
            process.env.MEMPOOL_RETRY_URL = 'https://mempool-retry-url.space'
            const { getMempoolClient } = require('../utils/mempool')
            const mempoolClient = getMempoolClient()
            const consoleErrorSpy = jest.spyOn(global.console, 'error')

            // When
            try {
                await mempoolClient.get(endpoint)
            } catch (error) {
                // first request to MEMPOOL_URL
                expect(error.message).toBe('getaddrinfo ENOTFOUND mempool-url.space')
                // first request console error to MEMPOOL_URL
                expect(consoleErrorSpy).toHaveBeenNthCalledWith(
                    1,
                    `Attempted call with URL ${process.env.MEMPOOL_URL}${endpoint} failed: getaddrinfo ENOTFOUND mempool-url.space`
                )
                // second request console error to MEMPOOL_RETRY_URL
                expect(consoleErrorSpy).toHaveBeenNthCalledWith(
                    2,
                    `Attempted 1 call(s) with URL ${process.env.MEMPOOL_RETRY_URL}${endpoint} failed: getaddrinfo ENOTFOUND mempool-retry-url.space`
                )
            }
        })

        it('mempool client should use MEMPOOL_RETRY_URL as retry for 3 times when MEMPOOL_RETRY_ATTEMPTS is 3', async () => {
            // Given
            const endpoint = '/api/not-existing-endpoint'
            process.env.MEMPOOL_URL = 'https://mempool-url.space'
            process.env.MEMPOOL_RETRY_URL = 'https://mempool-retry-url.space'
            process.env.MEMPOOL_RETRY_ATTEMPTS = 3
            const { getMempoolClient } = require('../utils/mempool')
            const mempoolClient = getMempoolClient()
            const consoleErrorSpy = jest.spyOn(global.console, 'error')

            // When
            try {
                await mempoolClient.get(endpoint)
            } catch (error) {
                // first request to MEMPOOL_URL
                expect(consoleErrorSpy).toHaveBeenCalledTimes(4)
                expect(consoleErrorSpy).toHaveBeenNthCalledWith(
                    2,
                    `Attempted 1 call(s) with URL ${process.env.MEMPOOL_RETRY_URL}${endpoint} failed: getaddrinfo ENOTFOUND mempool-retry-url.space`
                )
                expect(consoleErrorSpy).toHaveBeenNthCalledWith(
                    3,
                    `Attempted 2 call(s) with URL ${process.env.MEMPOOL_RETRY_URL}${endpoint} failed: getaddrinfo ENOTFOUND mempool-retry-url.space`
                )
                expect(consoleErrorSpy).toHaveBeenNthCalledWith(
                    4,
                    `Attempted 3 call(s) with URL ${process.env.MEMPOOL_RETRY_URL}${endpoint} failed: getaddrinfo ENOTFOUND mempool-retry-url.space`
                )
            }
        })
    })
})

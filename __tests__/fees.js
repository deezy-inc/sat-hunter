describe('fees', () => {
    beforeEach(() => {
        jest.resetAllMocks()
        jest.resetModules()
    })

    describe('get_min_next_block_fee_rate', () => {
        describe('original mempool up', () => {
            beforeEach(() => {
                jest.mock('axios', () => ({
                    ...jest.requireActual('axios'),
                    create: () => ({
                        ...jest.requireActual('axios'),
                        get: jest.fn().mockResolvedValue({ data: [{ feeRange: [8.1, 9.2, 10, 11, 17] }] }),
                    }),
                }))
            })

            test('return correct fee rate using MIN_FEE_BUFFER_PERCENT', async () => {
                process.env.MIN_FEE_BUFFER_PERCENT = 1.1
                delete process.env.NEXT_BLOCK_FEE_SLOT
                const { get_min_next_block_fee_rate } = require('../fees')

                expect(await get_min_next_block_fee_rate()).toBe(9.0)
            })

            test('return correct fee rate using nonzero NEXT_BLOCK_FEE_SLOT and MIN_FEE_BUFFER_PERCENT', async () => {
                process.env.MIN_FEE_BUFFER_PERCENT = 1.1
                process.env.NEXT_BLOCK_FEE_SLOT = 1
                const { get_min_next_block_fee_rate } = require('../fees')

                expect(await get_min_next_block_fee_rate()).toBe(10.2)
            })
        })

        describe('original mempool down', () => {
            test('should print error to console, but return a valid value', async () => {
                // Given
                jest.mock('axios', () => jest.requireActual('axios'))
                process.env.MEMPOOL_URL = 'http://mempool-not-real-to-fail.space'
                const consoleErrorSpy = jest.spyOn(global.console, 'error')

                // When
                const { get_min_next_block_fee_rate } = require('../fees')
                const value = await get_min_next_block_fee_rate()

                // Then
                expect(value).toBeTruthy()
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    `Attempted call with URL ${process.env.MEMPOOL_URL}/api/v1/fees/mempool-blocks failed: getaddrinfo ENOTFOUND mempool-not-real-to-fail.space`
                )
            })

            test('should print 2 errors to console and return error, when 2 mempool clients are down', async () => {
                // Given
                jest.mock('axios', () => jest.requireActual('axios'))
                process.env.MEMPOOL_URL = 'http://mempool-not-real-to-fail.space'
                process.env.MEMPOOL_RETRY_URL = 'http://mempool-not-real-to-fail2.space'
                const consoleErrorSpy = jest.spyOn(global.console, 'error')

                // When
                const { get_min_next_block_fee_rate } = require('../fees')

                // Then
                try {
                    await get_min_next_block_fee_rate()
                } catch (error) {
                    expect(error).toEqual(new Error('Could not get mempool blocks'))
                    expect(consoleErrorSpy).toHaveBeenNthCalledWith(
                        1,
                        `Attempted call with URL http://mempool-not-real-to-fail.space/api/v1/fees/mempool-blocks failed: getaddrinfo ENOTFOUND mempool-not-real-to-fail.space`
                    )
                    expect(consoleErrorSpy).toHaveBeenNthCalledWith(
                        2,
                        `Attempted 1 call(s) with URL http://mempool-not-real-to-fail2.space/api/v1/fees/mempool-blocks failed: getaddrinfo ENOTFOUND mempool-not-real-to-fail2.space`
                    )
                }
            })
        })
    })
})

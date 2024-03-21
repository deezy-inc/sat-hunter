describe('fees', () => {
    describe('get_min_next_block_fee_rate', () => {
        describe('original mempool up', () => {
            beforeEach(() => {
                jest.resetModules()
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
            beforeEach(() => {
                jest.resetModules()
            })

            test('return correct fee rate using MIN_FEE_BUFFER_PERCENT', async () => {
                // Given
                process.env.MEMPOOL_URL = 'http://mempool-not-real-to-fail.space'
                jest.mock('axios', () => jest.requireActual('axios'))
                const consoleErrorSpy = jest.spyOn(global.console, 'error')

                // When
                const { get_min_next_block_fee_rate } = require('../fees')
                get_min_next_block_fee_rate().then((value) => {
                    expect(consoleErrorSpy).toHaveBeenCalledWith(
                        `Attempted call with URL ${process.env.MEMPOOL_URL}/api/v1/fees/mempool-blocks failed: getaddrinfo ENOTFOUND mempool-not-real-to-fail.space`
                    )
                    expect(value).toBeTruthy()
                })
            })
        })
    })
})

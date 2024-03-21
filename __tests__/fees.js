describe('fees', () => {
    describe('get_min_next_block_fee_rate', () => {
        beforeAll(() => {
            jest.mock('axios', () => ({
                get: jest.fn().mockResolvedValue({ data: [{ feeRange: [8.1, 9.2, 10, 11, 17] }] }),
                create: jest.requireActual('axios').create,
            }))
        })
        afterEach(() => {
            jest.resetModules()
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
})

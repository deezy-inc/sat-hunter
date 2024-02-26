function mockMempoolBlockFeeRateResponse({ axios, feeRange }) {
    axios.get.mockImplementation((path) => {
        if (path.endsWith('/api/v1/fees/mempool-blocks')) {
            return Promise.resolve({ data: [{ feeRange }] });
        }
        return Promise.reject({});
    })
}

describe('get_min_next_block_fee_rate', () => {
    test('return correct fee rate using MIN_FEE_BUFFER_PERCENT', async () => {
        jest.resetModules();
        const axios = require('axios')
        jest.mock('axios')
        process.env.MIN_FEE_BUFFER_PERCENT = 1.1
        delete process.env.NEXT_BLOCK_FEE_SLOT
        mockMempoolBlockFeeRateResponse({
            axios,
            feeRange: [8.1, 9.2, 10, 11, 17]
        })
        const {
            get_min_next_block_fee_rate
        } = require('../fees') // We need to load this after setting the environment variable above otherwise it won't take effect.

        expect(await get_min_next_block_fee_rate()).toBe(9.0)
    });
    test('return correct fee rate using nonzero NEXT_BLOCK_FEE_SLOT and MIN_FEE_BUFFER_PERCENT', async () => {
        jest.resetModules();
        const axios = require('axios')
        jest.mock('axios')
        process.env.MIN_FEE_BUFFER_PERCENT = 1.1
        process.env.NEXT_BLOCK_FEE_SLOT = 1
        mockMempoolBlockFeeRateResponse({
            axios,
            feeRange: [8.1, 9.2, 10, 11, 17]
        })
        const {
            get_min_next_block_fee_rate
        } = require('../fees') // We need to load this after setting the environment variable above otherwise it won't take effect.
        expect(await get_min_next_block_fee_rate()).toBe(10.2)
    });
});
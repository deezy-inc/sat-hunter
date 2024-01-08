const MEMPOOL_URL = process.env.MEMPOOL_URL || 'https://mempool.space'
const MEMPOOL_RETRY_URL = process.env.MEMPOOL_RETRY_URL || 'https://mempool.deezy.io'
const MEMPOOL_RETRY_ATTEMPTS = process.env.MEMPOOL_RETRY_ATTEMPTS || 0
const { request_with_retry } = require('./utils.js')
const FEE_PREF = process.env.FEE_PREFERENCE || 'medium'
if (FEE_PREF !== 'high' && FEE_PREF !== 'medium' && FEE_PREF !== 'low') {
    throw new Error('FEE_PREFERENCE must be one of: high, medium, low')
}

if (process.env.MIN_FEE_BUFFER && process.env.MIN_FEE_BUFFER_PERCENT) {
    throw new Error('MIN_FEE_BUFFER and MIN_FEE_BUFFER_PERCENT cannot both be set')
}
let MIN_FEE_BUFFER_PERCENT
if (process.env.MIN_FEE_BUFFER_PERCENT) {
    MIN_FEE_BUFFER_PERCENT = parseFloat(process.env.MIN_FEE_BUFFER_PERCENT)
    if (MIN_FEE_BUFFER_PERCENT < 1 || MIN_FEE_BUFFER_PERCENT > 2) {
        console.log(`MIN_FEE_BUFFER_PERCENT must be between 1.00 and 2.00`)
    }
}
const MIN_FEE_BUFFER = parseFloat(process.env.MIN_FEE_BUFFER || 3)
// Get fee rate from mempool.space
async function get_fee_rate() {
    const axiosConfig = {
        url: `${MEMPOOL_URL}/api/v1/fees/recommended`,
        method: 'get'
    };
    const retryUrl = `${MEMPOOL_RETRY_URL}/api/v1/fees/recommended`;

    const response = await request_with_retry(axiosConfig, retryUrl, MEMPOOL_RETRY_ATTEMPTS)
        .catch(err => {
            console.error(err);
            return { data: {} };
        });

    const data = response;

    if (FEE_PREF === 'high') return data.fastestFee;
    if (FEE_PREF === 'medium') return data.halfHourFee;
    if (FEE_PREF === 'low') return data.hourFee;
    throw new Error('FEE_PREFERENCE must be one of: high, medium, low');
}

// Unused? Remove?
async function get_min_next_block_fee_rate() {
    const axiosConfig = {
        url: `${MEMPOOL_URL}/api/v1/fees/mempool-blocks`,
        method: 'get'
    };
    const retryUrl = `${MEMPOOL_RETRY_URL}/api/v1/fees/mempool-blocks`;

    const response = await request_with_retry(axiosConfig, retryUrl, MEMPOOL_RETRY_ATTEMPTS)
        .catch(err => {
            console.error(err);
            return { data: {} };
        });

    const data = response;

    if (!data) {
        throw new Error('Could not get mempool blocks');
    }

    if (MIN_FEE_BUFFER_PERCENT) {
        const min_fee_buffer_percent = parseFloat(process.env.MIN_FEE_BUFFER_PERCENT);
        return Math.round((data[0].feeRange[0] * min_fee_buffer_percent) * 10) / 10;
    }
    // We add 3 right now because we want to be sure we get into the next block.
    return Math.round((data[0].feeRange[0] + MIN_FEE_BUFFER) * 10) / 10;
}

module.exports = {
    get_fee_rate
}

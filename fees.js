const axios = require('axios')

const FEE_PREF = process.env.FEE_PREFERENCE || 'medium'
if (FEE_PREF !== 'high' && FEE_PREF !== 'medium' && FEE_PREF !== 'low') {
    throw new Error('FEE_PREFERENCE must be one of: high, medium, low')
}
// Get fee rate from mempool.space
async function get_fee_rate() {
    if (process.env.AUTO_RBF) {
        return get_min_next_block_fee_rate()
    }
    const { data } = await axios.get('https://mempool.space/api/v1/fees/recommended').catch(err => {
        console.error(err)
        return { data: {} }
    })
    if (FEE_PREF === 'high') return data.fastestFee
    if (FEE_PREF === 'medium') return data.halfHourFee
    if (FEE_PREF === 'low') return data.hourFee
    throw new Error('FEE_PREFERENCE must be one of: high, medium, low')
}

async function get_min_next_block_fee_rate() {
    const { data } = await axios.get('https://mempool.space/api/v1/fees/mempool-blocks').catch(err => {
        console.error(err)
        return { }
    })
    if (!data) {
        throw new Error('Could not get mempool blocks')
    }
    return data[0].feeRange[1].toFixed(1)
}

module.exports = {
    get_fee_rate
}
const axios = require('axios')

const FEE_PREF = process.env.FEE_PREFERENCE || 'medium'
if (FEE_PREF !== 'high' && FEE_PREF !== 'medium' && FEE_PREF !== 'low') {
    throw new Error('FEE_PREFERENCE must be one of: high, medium, low')
}
// Get fee rate from mempool.space
async function get_fee_rate() {
    const { data } = await axios.get('https://mempool.space/api/v1/fees/recommended').catch(err => {
        console.error(err)
        return { data: {} }
    })
    if (FEE_PREF === 'high') return data.fastestFee
    if (FEE_PREF === 'medium') return data.halfHourFee
    if (FEE_PREF === 'low') return data.hourFee
    throw new Error('FEE_PREFERENCE must be one of: high, medium, low')
}

module.exports = {
    get_fee_rate
}
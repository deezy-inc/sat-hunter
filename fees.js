const axios = require('axios')

// Get fee rate from mempool.space
async function get_fee_rate() {
    const { data } = await axios.get('https://mempool.space/api/v1/fees/recommended').catch(err => {
        console.error(err)
        return { data: {} }
    })
    return data.hourFee
}

module.exports = {
    get_fee_rate
}
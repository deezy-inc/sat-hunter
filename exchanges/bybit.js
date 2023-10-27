const {
    RestClientV5,
} = require('bybit-api');

let client = null;

function init_client() {
    if (!process.env.BYBIT_API_KEY || !process.env.BYBIT_API_SECRET) {
        throw new Error('BYBIT_API_KEY and BYBIT_API_SECRET must be set')
    }
    client = new RestClientV5({
        key: API_KEY,
        secret: API_SECRET
    })
}
async function withdraw({ amount_btc }) {
    if (!client) init_client()
    if (!process.env.BYBIT_WITHDRAWAL_ADDRESS) {
        throw new Error('BYBIT_WITHDRAWAL_ADDRESS must be set')
    }
    const { retCode, result } = await client.submitWithdrawal({
        coin: 'BTC',
        chain: 'BTC',
        address: process.env.BYBIT_WITHDRAWAL_ADDRESS,
        amount: `${amount_btc}`,
        timestamp: Date.now(),
        accountType: 'FUND',
        feeType: 1
    }).catch(err => {
        console.log(err)
        return {}
    })
    if (!retCode || retCode !== 0) {
        throw new Error(`Error withdrawing from Bybit: ${result}`)
    }
    console.log(result)
}


async function get_btc_balance() {
    if (!client) init_client()
    const { retCode, result } = await client.getWithdrawableAmount({ coin: 'BTC' }).catch(err => {
        console.log(err)
        return {}
    })
    if (!retCode || retCode !== 0) {
        throw new Error(`Error getting Bybit balance`)
    }
    return result.withdrawableAmount.FUND.withdrawableAmount
}

async function get_deposit_address() {
    if (!process.env.BYBIT_DEPOSIT_ADDRESS) {
        throw new Error('BYBIT_DEPOSIT_ADDRESS must be set')
    }
    return process.env.BYBIT_DEPOSIT_ADDRESS
}

module.exports = {
    get_btc_balance,
    withdraw,
    get_deposit_address
}
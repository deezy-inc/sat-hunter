const axios = require('axios')
const crypto = require('crypto')

function generate_headers({ path, body }) {
    const nonce = (Date.now() * 1000).toString();
    const payload = `/api/${path}${nonce}${JSON.stringify(body)}`;
    const signature = crypto.createHmac('sha384', process.env.BFX_API_SECRET).update(payload).digest('hex');
    return {
        'bfx-nonce': nonce,
        'bfx-signature': signature,
        'bfx-apikey': process.env.BTC_API_KEY,
        'content-type': 'application/json'
    };
}

function check_api_key() {
    if (!process.env.BFX_API_KEY || !process.env.BFX_API_SECRET) {
        throw new Error('BFX_API_KEY and BFX_API_SECRET must be set')
    }
}

async function get_btc_balance() {
    check_api_key()
    const path = 'v2/auth/r/wallets';
    const post_data = {};
    const headers = generate_headers({ path, body: post_data })
    const result = await axios.post(`https://api.bitfinex.com/${path}`, post_data, { headers })
    const btcWalletBalances = result.data.find(it => it[0] === 'exchange' && it[1] === 'BTC')
    return (btcWalletBalances && btcWalletBalances[4]) || 0
}

async function withdraw({ amount_btc }) {
    check_api_key()
    if (!process.env.BTC_WITHDRAW_ADDRESS) {
        throw new Error('BTC_WITHDRAW_ADDRESS must be set')
    }
    console.log(`Withdrawing ${amount_btc} BTC to ${process.env.BTC_WITHDRAW_ADDRESS}`)
    const path = 'v2/auth/w/withdraw';
    const post_data = {
        wallet: 'exchange',
        method: 'bitcoin',
        amount: `${amount_btc}`,
        address: process.env.BTC_WITHDRAW_ADDRESS,
        fee_deduct: 1
    };
    const headers = generate_headers({ path, body: post_data })
    const result = await axios.post(`https://api.bitfinex.com/${path}`, post_data, { headers })
    console.log(result.data)
}

module.exports = {
    get_btc_balance,
    withdraw
}
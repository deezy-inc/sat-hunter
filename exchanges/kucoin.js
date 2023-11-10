const axios = require('axios')
const crypto = require('crypto')
const BASE_URL = 'https://api.kucoin.com'

function create_signature({ data }) {
    return crypto.createHmac('sha256', process.env.KUCOIN_API_SECRET)
        .update(data)
        .digest('base64');
}
function create_headers({ path, timestamp, method, body = '' }) {
    return {
        'KC-API-KEY': process.env.KUCOIN_API_KEY,
        'KC-API-TIMESTAMP': timestamp,
        'KC-API-SIGN': create_signature({ data: `${timestamp}${method}${path}${body}` }),
        'KC-API-PASSPHRASE': create_signature({ data: process.env.KUCOIN_API_PASSPHRASE }),
        'KC-API-KEY-VERSION': '2'
    }
}

async function get_btc_balance() {
    if (!process.env.KUCOIN_API_KEY || !process.env.KUCOIN_API_SECRET || !process.env.KUCOIN_API_PASSPHRASE) {
        throw new Error('KUCOIN_API_KEY, KUCOIN_API_SECRET, and KUCOIN_API_PASSPHRASE must be set')
    }
    const path = '/api/v1/accounts?currency=BTC&type=main'
    const timestamp = (new Date()).toISOString()
    const method = 'GET'
    const headers = create_headers({ path, timestamp, method })
    const { data } = await axios.get(`${BASE_URL}${path}`, { headers }).catch(err => {
        console.log(err)
        return {}
    })
    return parseFloat(data.data[0].available)
}

async function withdraw({ amount_btc }) {
    if (!process.env.KUCOIN_API_KEY || !process.env.KUCOIN_API_SECRET) {
        throw new Error('KUCOIN_API_KEY and KUCOIN_API_SECRET must be set')
    }
    if (!process.env.KUCOIN_WITHDRAWAL_ADDRESS) {
        throw new Error('KUCOIN_WITHDRAWAL_ADDRESS must be set')
    }
    const path = `/api/v1/withdrawals`
    const timestamp = (new Date()).toISOString()
    const method = 'POST'
    const amount = (amount_btc).toFixed(8)
    console.log(`Attempting to withdraw ${amount} BTC`)
    const body = {
        currency: 'BTC',
        address: process.env.KUCOIN_WITHDRAWAL_ADDRESS,
        amount,
        feeDeductType: 'INTERNAL'
    }
    const headers = create_headers({ path, timestamp, method, body: JSON.stringify(body) })
    headers['Content-Type'] = 'application/json'
    const url = `${BASE_URL}${path}`
    const { data } = await axios.post(url, body, { headers }).catch(err => {
        console.log(err.response.data)
        throw new Error(JSON.stringify(err.response.data, null, 2))
    })
    console.log(data)
}

async function get_deposit_address() {
    if (!process.env.KUCOIN_DEPOSIT_ADDRESS) {
        throw new Error('KUCOIN_DEPOSIT_ADDRESS must be set')
    }
    return process.env.KUCOIN_DEPOSIT_ADDRESS
}

module.exports = {
    get_btc_balance,
    withdraw,
    get_deposit_address,
}
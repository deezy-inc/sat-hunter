const axios = require('axios')
const crypto = require('crypto')
const BASE_URL = process.env.OKX_BASE_URL || 'https://www.okcoin.com'

const FEE_BUFFER = 0.0005 // We deduct a small amount from the withdrawal amount to cover the tx fee.
function create_signature({ path, timestamp, method, body = ''}) {
    const data = `${timestamp}${method}${path}${body}`
    return crypto.createHmac('sha256', process.env.OKX_API_SECRET)
        .update(data)
        .digest('base64');
}
function create_headers({ path, timestamp, method, body = '' }) {
    return {
        'OK-ACCESS-KEY': process.env.OKX_API_KEY,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-SIGN': create_signature({ path, timestamp, method, body }),
        'OK-ACCESS-PASSPHRASE': process.env.OKX_API_PASSPHRASE
    }
}

async function get_btc_balance() {
    if (!process.env.OKX_API_KEY || !process.env.OKX_API_SECRET || !process.env.OKX_API_PASSPHRASE) {
        throw new Error('OKX_API_KEY, OKX_API_SECRET, and OKX_API_PASSPHRASE must be set')
    }
    const path = '/api/v5/asset/balances?ccy=BTC'
    const timestamp = (new Date()).toISOString()
    const method = 'GET'
    const headers = create_headers({ path, timestamp, method })
    const { data } = await axios.get(`${BASE_URL}${path}`, { headers }).catch(err => {
        console.log(err)
        return {}
    })
    return parseFloat(data.data[0].availBal)
}

async function withdraw({ amount_btc }) {
    if (!process.env.OKX_API_KEY || !process.env.OKX_API_SECRET) {
        throw new Error('OKX_API_KEY and OKX_API_SECRET must be set')
    }
    if (!process.env.OKX_WITHDRAWAL_ADDRESS) {
        throw new Error('OKX_WITHDRAWAL_ADDRESS must be set')
    }
    const path = `/api/v5/asset/withdrawal`
    const timestamp = (new Date()).toISOString()
    const method = 'POST'
    const amount = (amount_btc - FEE_BUFFER).toFixed(8)
    console.log(`Attempting to withdraw ${amount} BTC`)
    const body = {
        amt: amount,
        fee: `${FEE_BUFFER}`,
        dest: 4,
        ccy: 'BTC',
        toAddr: process.env.OKX_WITHDRAWAL_ADDRESS
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
    if (!process.env.OKX_DEPOSIT_ADDRESS) {
        throw new Error('OKX_DEPOSIT_ADDRESS must be set')
    }
    return process.env.OKX_DEPOSIT_ADDRESS
}

module.exports = {
    get_btc_balance,
    withdraw,
    get_deposit_address
}
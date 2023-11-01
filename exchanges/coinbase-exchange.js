const axios = require('axios')
const crypto = require('crypto')
const totp = require("totp-generator")
const BASE_URL = 'https://api.exchange.coinbase.com'

let BTC_ACCOUNT_ID = null

function create_signature({ path, timestamp, method, body = ''}) {
    const data = `${timestamp}${method}${path}${body}`
    const base64_key = Buffer.from(process.env.COINBASE_EXCHANGE_API_SECRET, 'base64')
    return crypto.createHmac('sha256', base64_key)
        .update(data)
        .digest('base64');
}
function create_headers({ path, timestamp, method, body = '' }) {
    return {
        'CB-ACCESS-KEY': process.env.COINBASE_EXCHANGE_API_KEY,
        'CB-ACCESS-PASSPHRASE': process.env.COINBASE_EXCHANGE_API_PASSPHRASE,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-SIGN': create_signature({ path, timestamp, method, body }),
        'CB-VERSION': '2023-10-19'
    }
}
async function get_btc_account_id() {
    const path = '/accounts'
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const method = 'GET'
    const headers = create_headers({ path, timestamp, method })
    const { data } = await axios.get(`${BASE_URL}${path}`, { headers }).catch(err => {
        console.log(err)
        return {}
    })
    const wallet_info = data.filter(it => it.currency === 'BTC')
    return wallet_info[0].id
}

async function get_btc_balance() {
    if (!process.env.COINBASE_EXCHANGE_API_KEY || !process.env.COINBASE_EXCHANGE_API_SECRET || !process.env.COINBASE_EXCHANGE_API_PASSPHRASE) {
        throw new Error('COINBASE_EXCHANGE_API_KEY, COINBASE_EXCHANGE_API_SECRET, and COINBASE_EXCHANGE_API_PASSPHRASE must be set')
    }
    if (!BTC_ACCOUNT_ID) {
        BTC_ACCOUNT_ID = await get_btc_account_id()
    }
    const path = `/accounts/${BTC_ACCOUNT_ID}`
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const method = 'GET'
    const headers = create_headers({ path, timestamp, method })
    const { data } = await axios.get(`${BASE_URL}${path}`, { headers }).catch(err => {
        console.log(err)
        return {}
    })
    return parseFloat(parseFloat(data.available).toFixed(8))
}

async function withdraw({ amount_btc }) {
    if (!process.env.COINBASE_EXCHANGE_API_KEY || !process.env.COINBASE_EXCHANGE_API_SECRET) {
        throw new Error('COINBASE_EXCHANGE_API_KEY and COINBASE_EXCHANGE_API_SECRET must be set')
    }
    if (!process.env.COINBASE_EXCHANGE_WITHDRAWAL_ADDRESS) {
        throw new Error('COINBASE_WITHDRAW_ADDRESS must be set')
    }
    if (!BTC_ACCOUNT_ID) {
        BTC_ACCOUNT_ID = await get_btc_account_id()
    }
    const path = `/withdrawals/crypto`
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const method = 'POST'
    const body = {
        amount: amount_btc.toFixed(8),
        currency: 'BTC',
        profile_id: BTC_ACCOUNT_ID,
        crypto_address: process.env.COINBASE_EXCHANGE_WITHDRAWAL_ADDRESS,
        add_network_fee_to_total: false,
    }
    if (process.env.COINBASE_EXCHANGE_TOTP_SECRET) {
        body.two_factor_code = totp(process.env.COINBASE_EXCHANGE_TOTP_SECRET)
    }
    const headers = create_headers({ path, timestamp, method, body: JSON.stringify(body) })
    headers['Content-Type'] = 'application/json'
    const { data } = await axios.post(`${BASE_URL}${path}`, body, { headers }).catch(err => {
        console.log(err.response.data)
        throw new Error(JSON.stringify(err.response.data, null, 2))
    })
    console.log(data)
}

async function get_deposit_address() {
    if (!process.env.COINBASE_EXCHANGE_DEPOSIT_ADDRESS) {
        throw new Error('COINBASE_EXCHANGE_DEPOSIT_ADDRESS must be set')
    }
    return process.env.COINBASE_EXCHANGE_DEPOSIT_ADDRESS
}

module.exports = {
    get_btc_balance,
    withdraw,
    get_deposit_address
}
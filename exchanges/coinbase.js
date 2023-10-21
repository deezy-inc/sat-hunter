const axios = require('axios')
const crypto = require('crypto')
const totp = require("totp-generator")
const BASE_URL = 'https://api.coinbase.com'

let BTC_ACCOUNT_ID = null
const FEE_BUFFER = 0.0005 // We deduct a small amount from the withdrawal amount to cover the tx fee.
function create_signature({ path, timestamp, method, body = ''}) {
    const data = `${timestamp}${method}${path}${body}`
    return crypto.createHmac('sha256', process.env.COINBASE_API_SECRET)
        .update(data)
        .digest('hex');
}
function create_headers({ path, timestamp, method, body = '' }) {
    return {
        'CB-ACCESS-KEY': process.env.COINBASE_API_KEY,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-SIGN': create_signature({ path, timestamp, method, body }),
        'CB-VERSION': '2023-10-19'
    }
}
async function get_btc_account_id() {
    const path = '/v2/accounts'
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const method = 'GET'
    const headers = create_headers({ path, timestamp, method })
    const { data } = await axios.get(`${BASE_URL}${path}`, { headers }).catch(err => {
        console.log(err)
        return {}
    })
    const wallet_info = data.data.filter(it => it.name === 'BTC Wallet')
    return wallet_info[0].id
}

async function get_btc_balance() {
    if (!process.env.COINBASE_API_KEY || !process.env.COINBASE_API_SECRET) {
        throw new Error('COINBASE_API_KEY and COINBASE_API_SECRET must be set')
    }
    if (!BTC_ACCOUNT_ID) {
        BTC_ACCOUNT_ID = await get_btc_account_id()
    }
    const path = `/v2/accounts/${BTC_ACCOUNT_ID}`
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const method = 'GET'
    const headers = create_headers({ path, timestamp, method })
    const { data } = await axios.get(`${BASE_URL}${path}`, { headers }).catch(err => {
        console.log(err)
        return {}
    })
    return parseFloat(data.data.balance.amount)
}

async function withdraw({ amount_btc }) {
    if (!process.env.COINBASE_API_KEY || !process.env.COINBASE_API_SECRET) {
        throw new Error('COINBASE_API_KEY and COINBASE_API_SECRET must be set')
    }
    if (!process.env.COINBASE_WITHDRAWAL_ADDRESS) {
        throw new Error('COINBASE_WITHDRAW_ADDRESS must be set')
    }
    if (!BTC_ACCOUNT_ID) {
        BTC_ACCOUNT_ID = await get_btc_account_id()
    }
    const path = `/v2/accounts/${BTC_ACCOUNT_ID}/transactions`
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const method = 'POST'
    const amount = (amount_btc - FEE_BUFFER).toFixed(8)
    console.log(`Attempting to withdraw ${amount} BTC`)
    const body = {
        amount,
        currency: 'BTC',
        to: process.env.COINBASE_WITHDRAWAL_ADDRESS,
        type: 'send',
        to_financial_institution: false,
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
    if (!process.env.COINBASE_DEPOSIT_ADDRESS) {
        throw new Error('COINBASE_DEPOSIT_ADDRESS must be set')
    }
    return process.env.COINBASE_DEPOSIT_ADDRESS
}

module.exports = {
    get_btc_balance,
    withdraw,
    get_deposit_address
}

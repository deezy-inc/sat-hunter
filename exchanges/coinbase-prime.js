const axios = require('axios')
const crypto = require('crypto')
const totp = require("totp-generator")
const BASE_URL = 'https://api.prime.coinbase.com/'

let BTC_WALLET_ID = null
let PORTFOLIO_ID = null
let ENTITY_ID = null

function create_signature({ path, timestamp, method, body = ''}) {
    const data = `${timestamp}${method}${path}${body}`
    const base64_key = Buffer.from(process.env.COINBASE_PRIME_SIGNING_KEY, 'base64')
    return crypto.createHmac('sha256', base64_key)
        .update(data)
        .digest('base64');
}
function create_headers({ path, timestamp, method, body = '' }) {
    return {
        'X-CB-ACCESS-KEY': process.env.COINBASE_PRIME_ACCESS_KEY,
        'X-CB-ACCESS-PASSPHRASE': process.env.COINBASE_PRIME_API_PASSPHRASE,
        'X-CB-ACCESS-TIMESTAMP': timestamp,
        'X-CB-ACCESS-SIGNATURE': create_signature({ path, timestamp, method, body })
    }
}

async function set_coinbase_ids() {
    const path = '/v1/portfolios'
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const method = 'GET'
    const headers = create_headers({ path, timestamp, method })
    const { data } = await axios.get(`${BASE_URL}${path}`, { headers }).catch(err => {
        console.log(err)
        return {}
    })
    console.log(data)
    PORTFOLIO_ID = data.portfolios[0].id
    ENTITY_ID = data.portfolios[0].entity_id
}

async function set_btc_wallet_id() {
    const path = `/v1/portfolios/${PORTFOLIO_ID}/wallets?type=TRADING&symbol=BTC`
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const method = 'GET'
    const headers = create_headers({ path, timestamp, method })
    const { data } = await axios.get(`${BASE_URL}${path}`, { headers }).catch(err => {
        console.log(err)
        return {}
    })
    console.log(data)
    BTC_WALLET_ID = data.wallets[0].id
}

async function get_btc_balance() {
    if (!process.env.COINBASE_PRIME_ACCESS_KEY || !process.env.COINBASE_PRIME_SIGNING_KEY || !process.env.COINBASE_PRIME_API_PASSPHRASE) {
        throw new Error('COINBASE_PRIME_ACCESS_KEY, COINBASE_PRIME_SIGNING_KEY, and COINBASE_PRIME_API_PASSPHRASE must be set')
    }
    if (!PORTFOLIO_ID || !ENTITY_ID) {
        await set_coinbase_ids()
    }
    if (!BTC_WALLET_ID) {
        await set_btc_wallet_id()
    }
    const path = `/v1/portfolios/${PORTFOLIO_ID}/wallets/${BTC_WALLET_ID}`
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const method = 'GET'
    const headers = create_headers({ path, timestamp, method })
    const { data } = await axios.get(`${BASE_URL}${path}`, { headers }).catch(err => {
        console.log(err)
        return {}
    })
    console.log(data)
    return parseFloat(data.balance.withdrawable_amount)
}

async function withdraw({ amount_btc }) {
    throw new Error("NOT IMPLEMENTED")
    if (!process.env.COINBASE_PRIME_ACCESS_KEY || !process.env.COINBASE_PRIME_SIGNING_KEY) {
        throw new Error('COINBASE_PRIME_ACCESS_KEY and COINBASE_PRIME_SIGNING_KEY must be set')
    }
    if (!process.env.COINBASE_PRIME_WITHDRAWAL_ADDRESS) {
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
        crypto_address: process.env.COINBASE_PRIME_WITHDRAWAL_ADDRESS,
        add_network_fee_to_total: false,
    }
    if (process.env.COINBASE_PRIME_TOTP_SECRET) {
        body.two_factor_code = totp(process.env.COINBASE_PRIME_TOTP_SECRET)
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
    if (!process.env.COINBASE_PRIME_DEPOSIT_ADDRESS) {
        throw new Error('COINBASE_PRIME_DEPOSIT_ADDRESS must be set')
    }
    return process.env.COINBASE_PRIME_DEPOSIT_ADDRESS
}

module.exports = {
    get_btc_balance,
    withdraw,
    get_deposit_address
}


const axios = require('axios')
const crypto = require("crypto");

const API_BASE = 'https://api.gemini.com'
const FEE_BUFFER = parseInt(process.env.GEMINI_FEE_BUFFER_SATS || 100000)
function create_signature({ base64_body }) {
    return crypto.createHmac('sha384', process.env.GEMINI_API_SECRET)
        .update(base64_body)
        .digest('hex');
}
function create_headers({ body }) {
    const base64_body = Buffer.from(JSON.stringify(body)).toString("base64")
    return {
        'X-GEMINI-APIKEY': process.env.GEMINI_API_KEY,
        'X-GEMINI-PAYLOAD': base64_body,
        'X-GEMINI-SIGNATURE': create_signature({ base64_body }),
        'Content-Type': 'text/plain',
        'Content-Length': '0',
    }
}

async function get_btc_balance() {
    const request = '/v1/balances'
    const nonce = Math.floor(Date.now() / 1000)
    const body = {
        request,
        nonce
    }
    const headers = create_headers({ body })
    const { data } = await axios.post(`${API_BASE}${request}`, null, { headers }).catch(err => {
        console.log(err)
        throw new Error(err)
    })
    const btc_balance = data.find(({ currency }) => currency === 'BTC')
    return btc_balance.amount
}

async function withdraw({ amount_btc }) {
    if (!process.env.GEMINI_WITHDRAWAL_ADDRESS) {
        throw new Error('GEMINI_WITHDRAWAL_ADDRESS must be set and allowlisted within Gemini')
    }
    const request = '/v1/withdraw/btc'
    const nonce = Math.floor(Date.now() / 1000 + 1.5) // The nonce cannot be same as previous call, so we add a little.
    const address = process.env.GEMINI_WITHDRAWAL_ADDRESS
    const amount = (amount_btc - (FEE_BUFFER / 100000000)).toFixed(8)
    const body = {
        request, nonce, address, amount
    }
    const headers = create_headers({ body })
    const { data } = await axios.post(`${API_BASE}${request}`, null, { headers }).catch(err => {
        console.log(err)
        throw new Error(err)
    })
    console.log(data)
}

async function get_deposit_address() {
    if (!process.env.GEMINI_DEPOSIT_ADDRESS) {
        throw new Error('GEMINI_DEPOSIT_ADDRESS must be set')
    }
    return process.env.GEMINI_DEPOSIT_ADDRESS
}

module.exports = {
    get_btc_balance,
    withdraw,
    get_deposit_address
}
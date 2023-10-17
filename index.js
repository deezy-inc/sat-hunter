require('dotenv').config()

const bitfinex = require('./exchanges/bitfinex')
const kraken = require('./exchanges/kraken')
const { list_unspent } = require('./bitcoin')
const { get_fee_rate } = require('./fees')
const {
    post_scan_request,
    get_scan_request
} = require('./deezy')

const exchanges = {
    'BFX': bitfinex,
    'KRAKEN': kraken
}
const available_exchanges = Object.keys(exchanges)

async function maybe_withdraw(exchange_name) {
    const exchange = exchanges[exchange_name]
    if (!exchange) {
        throw new Error(`${exchange_name} is not a valid exchange. Available options are ${available_exchanges.join(', ')}`)
    }

    const btc_balance = await exchange.get_btc_balance().catch(err => {
        console.error(err)
        return 0
    })
    console.log(`BTC balance on ${exchange_name}: ${btc_balance}`)

    console.log(`Skipping withdrawal section`)
    return
    // TODO: enable this
    if (btc_balance > 0) {
        await exchange.withdraw({ amount_btc: btc_balance }).catch(err => {
            console.error(err)
        })
    }
}

async function run() {
    const exchange_name = process.env.ACTIVE_EXCHANGE
    if (!exchange_name) {
        throw new Error(`ACTIVE_EXCHANGE must be set in .env\nAvailable options are ${available_exchanges.join(', ')}`)
    }

    // Withdraw any funds on exchange
    await maybe_withdraw(exchange_name)

    // List local unspent
    const unspents = list_unspent()
    console.log(unspents)

    // Check Deezy API for existing scan requests
    let fee_rate
    for (const unspent of unspents) {
        console.log(unspent)
        if (!fee_rate) {
            fee_rate = await get_fee_rate()
            fee_rate = Math.min(fee_rate, process.env.MAX_FEE_RATE || 99999999)
        }

    }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function runLoop() {
    console.log(process.env.KRAKEN_API_KEY)
    while (true) {
        await run().catch(err => {
            console.error(err)
        })
        await sleep(5000)
    }
}

runLoop()
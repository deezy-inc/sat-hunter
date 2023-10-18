require('dotenv').config()

const exchanges = require('./exchanges/config.js')
const {
    listunspent,
    utxoupdatepsbt,
    walletprocesspsbt,
    finalizepsbt
} = require('./bitcoin')
const { get_fee_rate } = require('./fees')
const {
    post_scan_request,
    get_scan_request
} = require('./deezy')
const {get_deposit_address} = require("./exchanges/kraken");

const available_exchanges = Object.keys(exchanges)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
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

async function sign_and_send_psbt({ psbt }) {
    console.log(`Updating psbt...`)
    const updated_psbt = utxoupdatepsbt({ psbt })
    console.log(`Signing psbt...`)
    const signed_psbt_info = walletprocesspsbt({ psbt: updated_psbt })
    console.log(signed_psbt_info)
    if (!signed_psbt_info.complete) {
        throw new Error('psbt is not complete')
    }
    const final_info = finalizepsbt({ psbt: signed_psbt_info.psbt })
    if (!final_info.complete) {
        throw new Error('psbt is not complete')
    }
    console.log(`Finalized transaction`)
    console.log(final_info)
    // TODO: check fee rate
    // TODO: broadcast
}

async function run() {
    const exchange_name = process.env.ACTIVE_EXCHANGE
    if (!exchange_name) {
        throw new Error(`ACTIVE_EXCHANGE must be set in .env\nAvailable options are ${available_exchanges.join(', ')}`)
    }

    // Withdraw any funds on exchange
    await maybe_withdraw(exchange_name)

    // List local unspent
    const unspents = listunspent()
    console.log(unspents)

    // TODO: Check Deezy API for existing scan requests

    let fee_rate
    const scan_request_ids = []
    for (const unspent of unspents) {
        console.log(unspent)
        if (!fee_rate) {
            fee_rate = await get_fee_rate()
            fee_rate = Math.min(fee_rate, process.env.MAX_FEE_RATE || 99999999)
        }
        const exchange_address = await get_deposit_address()
        const scan_request = await post_scan_request({
            utxo: unspent,
            exchange_address,
            extraction_fee_rate: fee_rate
        })
        scan_request_ids.push(scan_request.id)
    }
    for (let i = 0; i < scan_request_ids.length; i++) {
        const scan_request_id = scan_request_ids[i]
        console.log(`Checking status of scan request with id: ${scan_request_id}`)
        const info = await get_scan_request({ scan_request_id })
        if (info.status !== 'COMPLETED') {
            console.log(`Scan request with id: ${scan_request_id} is not complete yet, will wait and retry`)
            await sleep(2000)
            i--
            continue
        }
        console.log(`Scan request with id: ${scan_request_id} is complete`)
        console.log(info)
        // TODO: check for validity of PSBT.
        await sign_and_send_psbt({ psbt: info.extraction_psbt })
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
require('dotenv').config()
const util = require('util')
const ecc = require('tiny-secp256k1')
const bitcoin = require('bitcoinjs-lib')
bitcoin.initEccLib(ecc)
const exchanges = require('./exchanges/config.js')
const {
    get_utxos,
    sign_transaction,
    broadcast_transaction,
} = require('./wallet')
const { get_fee_rate } = require('./fees')
const {
    post_scan_request,
    get_scan_request
} = require('./deezy')

const available_exchanges = Object.keys(exchanges)
const FALLBACK_MAX_FEE_RATE = 200
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
async function maybe_withdraw(exchange_name, exchange) {
    const btc_balance = await exchange.get_btc_balance().catch(err => {
        console.error(err)
        return 0
    })
    console.log(`BTC balance on ${exchange_name}: ${btc_balance}`)

    if (btc_balance > (process.env.WITHDRAWAL_THRESHOLD_BTC || 0)) {
        console.log(`Withdrawing from ${exchange_name}...`)
        await exchange.withdraw({ amount_btc: btc_balance }).catch(err => {
            console.error(err)
        })
    } else {
        console.log(`Not enough BTC to withdraw from ${exchange_name}`)
    }
}

async function decode_sign_and_send_psbt({ psbt, exchange_address, rare_sat_address }) {
    console.log(`Checking validity of psbt...`)
    console.log(psbt)
    const decoded_psbt = bitcoin.Psbt.fromBase64(psbt)
    for (const output of decoded_psbt.txOutputs) {
        if (output.address !== exchange_address && output.address !== rare_sat_address) {
            throw new Error(`Invalid psbt. Output ${output.address} is not one of our addresses.`)
        }
    }
    console.log(`Signing psbt...`)
    const signed_psbt = sign_transaction({ psbt: psbt })
    const final_signed_psbt = bitcoin.Psbt.fromBase64(signed_psbt)
    final_signed_psbt.finalizeAllInputs()
    const final_fee_rate = final_signed_psbt.getFeeRate()
    console.log(`Final fee rate of signed psbt is ~${final_fee_rate} sat/vbyte`)
    if (final_fee_rate > (process.env.MAX_FEE_RATE || FALLBACK_MAX_FEE_RATE) ) {
        throw new Error(`Fee rate is too high: ${final_fee_rate} sat/vbyte`)
    }
    const final_tx = final_signed_psbt.extractTransaction()
    const final_hex = final_tx.toHex()
    console.log(`Finalized transaction`)
    console.log(final_hex)
    console.log(`Broadcasting transaction...`)
    const txid = await broadcast_transaction({ hex: final_hex})
    console.log(`Broadcasted transaction with txid: ${txid}`)
}

async function run() {
    const exchange_name = process.env.ACTIVE_EXCHANGE
    if (!exchange_name) {
        throw new Error(`ACTIVE_EXCHANGE must be set in .env\nAvailable options are ${available_exchanges.join(', ')}`)
    }
    const exchange = exchanges[exchange_name]
    if (!exchange) {
        throw new Error(`${exchange_name} is not a valid exchange. Available options are ${available_exchanges.join(', ')}`)
    }
    // Withdraw any funds on exchange
    await maybe_withdraw(exchange_name, exchange)

    // List local unspent
    console.log(`Listing existing wallet utxos...`)
    const utxos = await get_utxos()
    if (utxos.length === 0) {
        console.log(`No utxos found in wallet`)
        return
    }
    console.log(`Found ${utxos.length} utxos in wallet.`)
    console.log(utxos)

    // TODO: Check Deezy API for existing scan requests

    let fee_rate
    const scan_request_ids = []
    const exchange_address = await exchange.get_deposit_address()
    const rare_sat_address = process.env.RARE_SAT_ADDRESS
    for (const utxo of utxos) {
        console.log(`Preparing to scan: ${utxo}`)
        if (!fee_rate) {
            fee_rate = await get_fee_rate()
            fee_rate = Math.min(fee_rate, process.env.MAX_FEE_RATE || 99999999)
        }
        console.log(`Will use fee rate of ${fee_rate} sat/vbyte`)
        const scan_request = await post_scan_request({
            utxo,
            exchange_address,
            rare_sat_address,
            extraction_fee_rate: fee_rate
        })
        scan_request_ids.push(scan_request.id)
    }
    for (let i = 0; i < scan_request_ids.length; i++) {
        const scan_request_id = scan_request_ids[i]
        console.log(`Checking status of scan request with id: ${scan_request_id}`)
        const info = await get_scan_request({ scan_request_id })
        if (info.status !== 'COMPLETED') {
            console.log(`Waiting for scan to complete: ${scan_request_id}...`)
            await sleep(2000)
            i--
            continue
        }
        console.log(`Scan request with id: ${scan_request_id} is complete`)
        console.log(util.inspect(info, {showHidden: false, depth: null, colors: true}))
        // TODO: check for validity of PSBT.
        await decode_sign_and_send_psbt({ psbt: info.extraction_psbt, exchange_address, rare_sat_address })
    }
}

async function runLoop() {
    while (true) {
        await run().catch(err => {
            console.error(err)
        })
        await sleep(10000)
    }
}

runLoop()
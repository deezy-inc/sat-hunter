require('dotenv').config()
const util = require('util')
const ecc = require('tiny-secp256k1')
const bitcoin = require('bitcoinjs-lib')
bitcoin.initEccLib(ecc)
const exchanges = require('./exchanges/config.js')
const {
    get_utxos,
    sign_and_finalize_transaction,
    broadcast_transaction,
    fetch_most_recent_unconfirmed_send,
} = require('./wallet')
const { get_fee_rate } = require('./fees')
const {
    post_scan_request,
    get_scan_request
} = require('./deezy')
const {
    generate_satributes_message
} = require('./satributes')
const TelegramBot = require('node-telegram-bot-api')
let telegramBot = process.env.TELEGRAM_BOT_TOKEN ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN) : null
const TELEGRAM_BOT_ENABLED = telegramBot && process.env.TELEGRAM_CHAT_ID

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
        const err = await exchange.withdraw({ amount_btc: btc_balance }).catch(err => {
            if (TELEGRAM_BOT_ENABLED) {
                telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, `Error withdrawing from ${exchange_name}: ${err.message}`)
            }
            console.error(err)
            return err
        })
        if (!err && TELEGRAM_BOT_ENABLED) {
            telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, `Withdrew ${btc_balance} BTC from ${exchange_name}`)
        }
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
    const prev_tx = bitcoin.Transaction.fromBuffer(decoded_psbt.data.inputs[0].nonWitnessUtxo)
    const witnessUtxo = {
        value: prev_tx.outs[decoded_psbt.txInputs[0].index].value,
        script: prev_tx.outs[decoded_psbt.txInputs[0].index].script,
    }

    console.log(`Signing psbt...`)
    const signed_psbt = sign_and_finalize_transaction({ psbt: psbt, witnessUtxo })
    console.log(signed_psbt)
    const final_signed_psbt = bitcoin.Psbt.fromBase64(signed_psbt)
    const final_fee_rate = final_signed_psbt.getFeeRate()
    console.log(`Final fee rate of signed psbt is ~${final_fee_rate} sat/vbyte`)
    if (final_fee_rate > (process.env.MAX_FEE_RATE || FALLBACK_MAX_FEE_RATE) ) {
        throw new Error(`Fee rate is too high: ${final_fee_rate} sat/vbyte`)
    }
    const final_tx = final_signed_psbt.extractTransaction()
    const final_hex = final_tx.toHex()
    console.log(`Extracted transaction`)
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

    let fee_rate = await get_fee_rate()
    fee_rate = Math.min(fee_rate, process.env.MAX_FEE_RATE || 99999999)

    // TODO: first look for existing sends and try to RBF them.
    const {
        existing_fee_rate,
        input_utxo
    } = await fetch_most_recent_unconfirmed_send()
    const bump_utxos = []
    if (input_utxo) {
        if (fee_rate - existing_fee_rate > 1.2) {
            const msg = `Existing transaction has fee rate of ${existing_fee_rate} sat/vbyte. Will replace with ${fee_rate} sat/vbyte`
            console.log(msg)
            if (TELEGRAM_BOT_ENABLED) {
                telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, msg)
            }
            bump_utxos.push(input_utxo)
        }
    }
    const rescanned_utxos = new Set(bump_utxos)
    const rescan_request_ids = new Set()

    // List local unspent
    console.log(`Listing existing wallet utxos...`)
    const unspents = await get_utxos()
    console.log(`Found ${unspents.length} utxos in wallet.`)
    const utxos = unspents.concat(bump_utxos)
    if (utxos.length === 0) {
        return
    }
    console.log(utxos)

    // TODO: Check Deezy API for existing scan requests


    const scan_request_ids = []
    const exchange_address = await exchange.get_deposit_address()
    const rare_sat_address = process.env.RARE_SAT_ADDRESS
    for (const utxo of utxos) {
        console.log(`Preparing to scan: ${utxo}`)
        if (TELEGRAM_BOT_ENABLED && !rescanned_utxos.has(utxo)) {
            telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, `Initiating scan for: ${utxo}`)
        }
        console.log(`Will use fee rate of ${fee_rate} sat/vbyte`)
        const scan_request = await post_scan_request({
            utxo,
            exchange_address,
            rare_sat_address,
            extraction_fee_rate: fee_rate
        })
        scan_request_ids.push(scan_request.id)
        if (rescanned_utxos.has(utxo)) {
            rescan_request_ids.add(scan_request.id)
        }
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
        if (TELEGRAM_BOT_ENABLED && !rescan_request_ids.has(scan_request_id)) {
            telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, generate_satributes_message(info.satributes))
        }
        console.log(util.inspect(info, {showHidden: false, depth: null, colors: true}))
        // TODO: check for validity of PSBT.
        await decode_sign_and_send_psbt({ psbt: info.extraction_psbt, exchange_address, rare_sat_address })
    }
}

async function runLoop() {
    if (TELEGRAM_BOT_ENABLED) {
        console.log(`Telegram bot is enabled`)
        telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, `Starting up sat hunter on ${process.env.ACTIVE_EXCHANGE}`)
    }
    while (true) {
        await run().catch(err => {
            console.error(err)
        })
        await sleep(10000)
    }
}

runLoop()
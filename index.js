require('dotenv').config({
    override: true
})
const fs = require('fs')
const util = require('util')
const ecc = require('tiny-secp256k1')
const bitcoin = require('bitcoinjs-lib')
bitcoin.initEccLib(ecc)
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data')
}
if (!fs.existsSync('./data/empty-utxos')) {
    fs.mkdirSync('./data/empty-utxos')
}
const exchanges = require('./exchanges/config.js')
const {
    get_utxos,
    sign_and_finalize_transaction,
    broadcast_transaction,
    fetch_most_recent_unconfirmed_send
} = require('./wallet')
const { get_fee_rate } = require('./fees')
const { post_scan_request, get_scan_request } = require('./deezy')
const { generate_satributes_messages } = require('./satributes')
const { sendNotifications, TELEGRAM_BOT_ENABLED, PUSHOVER_ENABLED } = require('./notifications.js')
const { get_excluded_tags, get_min_tag_sizes } = require('./utils.js')
const LOOP_SECONDS = process.env.LOOP_SECONDS ? parseInt(process.env.LOOP_SECONDS) : 10
const available_exchanges = Object.keys(exchanges)
const FALLBACK_MAX_FEE_RATE = 200
const SCAN_MAX_RETRIES = 60
let notified_bank_run = false
let notified_withdrawal_disabled = false
let notified_error_withdrawing = false

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function maybe_withdraw(exchange_name, exchange) {
    const btc_balance = await exchange.get_btc_balance().catch((err) => {
        console.error(err)
        return 0
    })
    console.log(`BTC balance on ${exchange_name}: ${btc_balance}`)
    if (exchange_name === 'wasabi') {
        console.log(`No withdraws from Wasabi`)
        return
    }
    if (btc_balance > (process.env.WITHDRAWAL_THRESHOLD_BTC || 0)) {
        console.log(`Withdrawing from ${exchange_name}...`)
        let withdrawal_amount = btc_balance
        if (process.env.MAX_WITHDRAWAL_BTC) {
            withdrawal_amount = Math.min(withdrawal_amount, parseFloat(process.env.MAX_WITHDRAWAL_BTC))
        }
        const err = await exchange.withdraw({ amount_btc: withdrawal_amount }).catch(async (err) => {
            if (!notified_error_withdrawing) {
                await sendNotifications(`Error withdrawing from ${exchange_name}: ${err.message}`)
                notified_error_withdrawing = true
            }
            console.error(err)
            return err
        })
        if (!err) {
            const msg = `Withdrew ${withdrawal_amount} BTC from ${exchange_name}`
            console.log(msg)
            if (!process.env.ONLY_NOTIFY_ON_SATS) {
                await sendNotifications(msg)
            }
            notified_error_withdrawing = false
        }
    } else {
        console.log(`Not enough BTC to withdraw from ${exchange_name}`)
    }
}

async function decode_sign_and_send_psbt({ psbt, exchange_addresses, rare_sat_address, is_replacement }) {
    console.log(`Checking validity of psbt...`)
    console.log(psbt)
    const decoded_psbt = bitcoin.Psbt.fromBase64(psbt)
    for (const output of decoded_psbt.txOutputs) {
        if (!exchange_addresses.includes(output.address) && output.address !== rare_sat_address) {
            throw new Error(`Invalid psbt. Output ${output.address} is not one of our addresses.`)
        }
    }
    const prev_tx = bitcoin.Transaction.fromBuffer(decoded_psbt.data.inputs[0].nonWitnessUtxo)
    const witnessUtxo = {
        value: prev_tx.outs[decoded_psbt.txInputs[0].index].value,
        script: prev_tx.outs[decoded_psbt.txInputs[0].index].script
    }

    console.log(`Signing psbt...`)
    const signed_psbt = await sign_and_finalize_transaction({
        psbt: psbt,
        witnessUtxo
    })
    console.log(signed_psbt)
    const final_signed_psbt = bitcoin.Psbt.fromBase64(signed_psbt)
    const final_fee = final_signed_psbt.getFee()
    if (final_fee > (process.env.MAX_FEE_SATS || 10000000)) {
        console.log(`Fee of ${final_fee} is higher than configured max fee of ${process.env.MAX_FEE_SATS || 10000000} sats. Will not broadcast`)
        return
    }
    const final_tx = final_signed_psbt.extractTransaction()
    console.log(`Extracted transaction`)
    const final_vbytes = final_tx.virtualSize()
    const final_hex = final_tx.toHex()
    const final_fee_rate = (final_fee / final_vbytes).toFixed(1)
    console.log(`Final fee rate of signed psbt is ~${final_fee_rate} sat/vbyte`)
    if (parseFloat(final_fee_rate) > (process.env.MAX_FEE_RATE || FALLBACK_MAX_FEE_RATE)) {
        throw new Error(`Fee rate is too high: ${final_fee_rate} sat/vbyte`)
    }
    console.log(final_hex)
    console.log(`Broadcasting transaction...`)
    const txid = await broadcast_transaction({ hex: final_hex })
    if (!txid) return
    console.log(`Broadcasted transaction with txid: ${txid} and fee rate of ${final_fee_rate} sat/vbyte`)
    if (!process.env.ONLY_NOTIFY_ON_SATS) {
        await sendNotifications(
            `Broadcasted ${
                is_replacement ? 'replacement ' : ''
            }tx at ${final_fee_rate} sat/vbyte https://mempool.space/tx/${txid}`
        )
    }
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

    const withdrawal_disabled = process.env.DISABLE_WITHDRAWAL === '1'
    const bank_run_enabled = process.env.BANK_RUN === '1'

    if (withdrawal_disabled && bank_run_enabled) {
        throw new Error(
            `Incorrect configuration! Both DISABLE_WITHDRAWAL and BANK_RUN are configured. This disables deposits and withdrawals so no action can be taken.`
        )
    }

    if (!withdrawal_disabled) {
        await maybe_withdraw(exchange_name, exchange)
    }

    if (withdrawal_disabled && !notified_withdrawal_disabled) {
        console.log(`Withdrawal disabled. Not making any withdrawals from exchange.`)
        await sendNotifications(`Withdrawal is now disabled due to configuration. No withdrawals will be made from the exchange.`)
        notified_withdrawal_disabled = true
    }

    if (bank_run_enabled) {
        console.log(`Bank run enabled. Not sending to exchange.`)
        if (!notified_bank_run) {
            await sendNotifications(`Bank run enabled. Sending to exchange has been paused, no deposits will be made.`)
            notified_bank_run = true
        }
        return
    }

    let fee_rate = await get_fee_rate().catch((err) => {
        throw new Error(`Error getting fee rate: ${err.message}`)
    })
    fee_rate = Math.min(fee_rate, process.env.MAX_FEE_RATE || 99999999)

    const bump_utxos = []
    if (process.env.AUTO_RBF) {
        if (exchange_name === 'wasabi') {
            throw new Error('AUTO_RBF is not yet supported for wasabi')
        }
        const { existing_fee_rate, input_utxo} = await fetch_most_recent_unconfirmed_send()
        // TODO: fix this logic - there can only be one bump_utxo right now
        if (input_utxo) {
            console.log(`Found existing unconfirmed send with fee rate of ${existing_fee_rate} sat/vbyte`)
            console.log(`Current fee rate is ${fee_rate} sat/vbyte`)
            if (fee_rate - existing_fee_rate >= 2) {
                const msg = `Existing transaction has fee rate of ${existing_fee_rate} sat/vbyte. Will replace with ${fee_rate} sat/vbyte`
                console.log(msg)
                bump_utxos.push(input_utxo)
            }
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
    // console.log(utxos)

    // TODO: Check Deezy API for existing scan requests

    const scan_request_ids = []
    const exchange_addresses = []
    const rare_sat_address = process.env.RARE_SAT_ADDRESS
    for (const utxo of utxos) {
        if (fs.existsSync(`./data/empty-utxos/${utxo}`)) {
            // console.log(`Skipping ${utxo} because it is already scanned and empty`)
            continue
        }
        console.log(`Preparing to scan: ${utxo}`)
        if (!rescanned_utxos.has(utxo) && !process.env.ONLY_NOTIFY_ON_SATS) {
            await sendNotifications(`Initiating scan for: ${utxo}`)
        }
        console.log(`Will use fee rate of ${fee_rate} sat/vbyte`)
        const exchange_address = await exchange.get_deposit_address()
        exchange_addresses.push(exchange_address)
        const request_body = {
            utxo,
            exchange_addresses,
            rare_sat_address,
            extraction_fee_rate: fee_rate
        }
        let excluded_tags = get_excluded_tags({ fee_rate })
        if (excluded_tags) {
            console.log(`Using excluded tags: ${excluded_tags}`)
            request_body.excluded_tags = excluded_tags
        }
        let min_tag_sizes = get_min_tag_sizes({ fee_rate })
        if (min_tag_sizes) {
            console.log(`Using min tag sizes: ${min_tag_sizes}`)
            request_body.min_tag_sizes = min_tag_sizes
        }
        const scan_request = await post_scan_request(request_body)
        scan_request_ids.push(scan_request.id)
        if (rescanned_utxos.has(utxo)) {
            rescan_request_ids.add(scan_request.id)
        }
    }
    let num_retries = 0
    for (let i = 0; i < scan_request_ids.length; i++) {
        const scan_request_id = scan_request_ids[i]
        console.log(`Checking status of scan request with id: ${scan_request_id}`)
        const info = await get_scan_request({ scan_request_id })
        if (info.status === 'FAILED') {
            console.log(`Scan request with id: ${scan_request_id} failed`)
            continue
        }
        if (info.status !== 'COMPLETED') {
            console.log(`Waiting for scan to complete: ${scan_request_id}...`)
            await sleep(1000)
            num_retries++
            if (num_retries > SCAN_MAX_RETRIES) {
                console.log(`Scan seems stuck - will skip it`)
                continue
            }
            i--
            continue
        }
        console.log(`Scan request with id: ${scan_request_id} is complete`)
        if (!rescan_request_ids.has(scan_request_id)) {
            if (info.satributes.length > 0 || !process.env.ONLY_NOTIFY_ON_SATS) {
                const messages = generate_satributes_messages(info.satributes)
                for (const msg of messages) {
                    await sendNotifications(msg)
                }
            }
        }
        console.log(util.inspect(info, { showHidden: false, depth: null, colors: true }))
        if (exchange_name === 'wasabi' && info.satributes.length === 0) {
            console.log(`No sats found, skipping transaction spend for wasabi`)
            fs.writeFileSync(`./data/empty-utxos/${info.utxo}`, '')
            continue
        }
        await decode_sign_and_send_psbt({
            psbt: info.extraction_psbt,
            exchange_addresses,
            rare_sat_address,
            is_replacement: rescan_request_ids.has(scan_request_id)
        })
    }
}

async function runLoop() {
    if (TELEGRAM_BOT_ENABLED) console.log(`Telegram bot is enabled`)
    if (PUSHOVER_ENABLED) console.log(`Pushover bot is enabled`)
    await sendNotifications(`Starting up sat hunter on ${process.env.ACTIVE_EXCHANGE}`)

    while (true) {
        await run().catch((err) => {
            console.error(err)
        })
        await sleep(LOOP_SECONDS * 1000)
    }
}

runLoop()

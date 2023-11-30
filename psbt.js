const ecc = require('tiny-secp256k1')
const bitcoin = require('bitcoinjs-lib')
bitcoin.initEccLib(ecc)
const {
    sign_and_finalize_transaction,
    broadcast_transaction,
} = require('./wallet')

const FALLBACK_MAX_FEE_RATE = 200

async function decode_sign_and_send_psbt({ psbt, exchange_address, rare_sat_address, is_replacement }) {
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

module.exports = {
    decode_sign_and_send_psbt
}
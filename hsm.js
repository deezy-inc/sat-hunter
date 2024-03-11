const child_process = require('node:child_process')
const hsm_command = process.env.HSM_CLI_PATH || 'ckcc'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { BIP32Factory } = require('bip32')
const bip32 = BIP32Factory(ecc)

const ecc = require('tiny-secp256k1')
const bitcoin = require('bitcoinjs-lib')
const NETWORK = bitcoin.networks.bitcoin
bitcoin.initEccLib(ecc)

function isHexadecimal(str) {
    const hexRegex = /^[0-9A-Fa-f]*$/
    return str.length % 2 === 0 && hexRegex.test(str)
}

const validate_psbt = (psbtContent) => {
    const psbt = isHexadecimal(psbtContent)
        ? bitcoin.Psbt.fromHex(psbtContent, { network: NETWORK })
        : bitcoin.Psbt.fromBase64(psbtContent, { network: NETWORK })
    return psbt
}

function get_base64_psbt(psbt) {
    const psbt_object = validate_psbt(psbt)
    console.log(`PSBT object: ${JSON.stringify(psbt_object)}`)
    let psbtBase64
    if (/^[0-9a-fA-F]+$/.test(psbt)) {
        // PSBT is in hex, convert to Buffer then to base64
        const psbtBuffer = Buffer.from(psbt, 'hex')
        psbtBase64 = psbtBuffer.toString('base64')
    } else {
        // Assume PSBT is already in base64
        psbtBase64 = psbt
    }
    return psbtBase64
}

function check_wallet() {
    if (!process.env.USE_HSM) {
        throw new Error(`USE_HSM must be set in .env`)
    }
    if (!process.env.HSM_XPUB) {
        throw new Error(`HSM_XPUB must be set in .env`)
    }
    if (!process.env.HSM_CHILD_XPUB) {
        throw new Error(`HSM_CHILD_XPUB must be set in .env`)
    }
    if (!process.env.HSM_DERIVATION_PATH) {
        throw new Error(`HSM_DERIVATION_PATH must be set in .env`)
    }
}

function get_hsm_address() {
    if (!process.env.HSM_WALLET_ADDRESS) throw new Error(`HSM_WALLET_ADDRESS must be set in .env`)
    return process.env.HSM_WALLET_ADDRESS
}

// It fails if the coldcard is not connected or it is on HSM mode
function get_address_from_coldcard() {
    check_wallet()
    try {
        const addr = child_process.execSync(`${hsm_command} addr`).toString().trim()?.split('\n')?.[2]
        return addr
    } catch (error) {
        if (!process.env.HSM_WALLET_ADDRESS) {
            throw new Error(`HSM_WALLET_ADDRESS must be set in .env`)
        }
        return process.env.HSM_WALLET_ADDRESS
    }
}

function sign_message_with_coldcard(message) {
    check_wallet()
    const signingResult = child_process.execSync(`${hsm_command} msg ${message}`).toString()
    console.log(`Signing result: ${signingResult}`)
    return signingResult
}

function sign_psbt_with_coldcard(psbt) {
    check_wallet()
    const emptyPsbtBase64 = get_base64_psbt(psbt)
    const psbtObj = bitcoin.Psbt.fromBase64(emptyPsbtBase64, { network: NETWORK })
    const masterNode = bip32.fromBase58(process.env.HSM_XPUB)
    const childNode = bip32.fromBase58(process.env.HSM_CHILD_XPUB)
    psbtObj.updateInput(0, {
        bip32Derivation: [
            {
                masterFingerprint: masterNode.fingerprint,
                path: process.env.HSM_DERIVATION_PATH,
                pubkey: childNode.publicKey,
            },
        ],
    })
    const psbtBase64 = psbtObj.toBase64()
    const tempDir = os.tmpdir()
    const id = Math.random().toString(36).substring(7)
    // Create a temporary file to store the PSBT
    const psbtFilePath = path.join(tempDir, `psbt_in_${id}.psbt`)
    fs.writeFileSync(psbtFilePath, psbtBase64, 'base64')
    console.log(`PSBT file path: ${psbtFilePath}`)
    let signedPsbtBase64
    try {
        signedPsbtBase64 = child_process.execSync(`${hsm_command} sign --base64 -6 ${psbtFilePath}`).toString().trim()
    } catch (error) {
        console.error(`execSync error: ${error.message}`)
        throw new Error(error)
    } finally {
        fs.unlinkSync(psbtFilePath)
    }
    const unfinalizedPsbt = signedPsbtBase64.split('\n').pop()
    const finalPsbtObj = bitcoin.Psbt.fromBase64(unfinalizedPsbt, { network: NETWORK })
    finalPsbtObj.finalizeAllInputs()
    return finalPsbtObj.toBase64()
}

module.exports = {
    get_address_from_coldcard,
    get_hsm_address,
    sign_psbt_with_coldcard,
    sign_message_with_coldcard,
}

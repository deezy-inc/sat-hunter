const child_process = require('node:child_process')
const hsm_command = process.env.HSM_CLI_PATH || 'ckcc'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { BIP32Factory } = require('bip32')
const ecc = require('tiny-secp256k1')
const bip32 = BIP32Factory(ecc)
const bitcoin = require('bitcoinjs-lib')
const NETWORK = bitcoin.networks.bitcoin
bitcoin.initEccLib(ecc)

function get_base64_psbt(psbt) {
    if (/^[0-9a-fA-F]+$/.test(psbt)) {
        // PSBT is in hex, convert to Buffer then to base64
        return Buffer.from(psbt, 'hex').toString('base64')
    }
    // Assume PSBT is already in base64
    return psbt
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
function get_address_from_coldcard(derivation_path) {
    try {
        console.log(`Getting address for derivation path: ${derivation_path}`)
        const command = `${hsm_command} addr --segwit "${derivation_path}"`
        console.log(`\nRunning command: ${command}\n`)
        const addr = child_process.execSync(command).toString().trim()?.split('\n')?.[2]
        return addr
    } catch (error) {
        return ''
    }
}

function get_xpub_from_coldcard() {
    try {
        const xpub = child_process.execSync(`${hsm_command} xpub`).toString().trim()
        return xpub
    } catch (error) {
        console.error(`Error getting xpub: ${error.message}`)
        return ''
    }
}

function get_child_xpub_from_coldcard(derivation_path) {
    try {
        const addr = child_process.execSync(`${hsm_command} xpub "${derivation_path}"`).toString().trim()
        return addr
    } catch (error) {
        console.error(`Error getting child xpub: ${error.message}`)
        return ''
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
    get_xpub_from_coldcard,
    get_child_xpub_from_coldcard,
    check_wallet,
    get_base64_psbt,
}

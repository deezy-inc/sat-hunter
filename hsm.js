const { bitcoin } = require('bitcoinjs-lib/src/networks')
const child_process = require('node:child_process')
const hsm_command = process.env.HSM_CLI_PATH || 'ckcc --simulator' // TODO: change to 'ckcc' when ready
const fs = require('fs')
const os = require('os')
const path = require('path')

function parse_psbt(psbt) {
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
}

function get_address_from_hsm() {
    check_wallet()
    const addr = child_process.execSync(`${hsm_command} addr`).toString().trim()?.split('\n')?.[2]
    return addr
}

function sign_message_with_hsm(message) {
    check_wallet()
    const signingResult = child_process.execSync(`${hsm_command} msg ${message}`).toString()
    console.log(`Signing result: ${signingResult}`)
    return signingResult
}

async function sign_with_hsm({ psbt, witnessUtxo }) {
    // check_wallet()
    const psbtBase64 = parse_psbt(psbt)
    const tempDir = os.tmpdir()
    const psbtFilePath = path.join(tempDir, 'psbt_in.psbt')
    fs.writeFileSync(psbtFilePath, psbtBase64, 'base64')
    try {
        // Create a temporary file to store the PSBT
        // Adjust the command to use the file path
        const signedPsbtBase64 = child_process
            .execSync(`${hsm_command} sign --base64 --visualize ${psbtFilePath}`)
            .toString()
            .trim()
        console.log(`Signed PSBT: ${signedPsbtBase64}`) // TODO: remove debug log

        return signedPsbtBase64
    } catch (error) {
        console.error(`execSync error: ${error.message}`)
    } finally {
        fs.unlinkSync(psbtFilePath)
    }
}

module.exports = {
    get_address_from_hsm,
    sign_with_hsm,
    sign_message_with_hsm
}

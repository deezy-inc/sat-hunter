const child_process = require('child_process')
const hsm_command = process.env.HSM_CLI_PATH || 'ckcc --simulator' // TODO: change to 'ckcc' when ready

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
    // TODO: implement witnessUtxo?
    // Ensure PSBT is in base64 format for the Coldcard command
    const psbtBase64 = bitcoin.Psbt.fromBase64(psbt).toString('base64')

    return new Promise((resolve, reject) => {
        exec(`${hsm_command} sign --base64 --finalize ${psbtBase64}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`)
                return reject(error)
            }
            // Process the signed PSBT returned from Coldcard
            const signedPsbtBase64 = stdout.trim()
            console.log(`Signed PSBT: ${signedPsbtBase64}`) // TODO: remove debug log
            resolve(signedPsbtBase64)
        })
    })
}

module.exports = {
    get_address_from_hsm,
    sign_with_hsm,
    sign_message_with_hsm
}

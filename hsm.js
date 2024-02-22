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

module.exports = {
    get_address_from_hsm
}

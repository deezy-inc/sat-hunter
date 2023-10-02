const child_process = require('child_process')
const bitcoin_command = process.env.BITCOIN_CLI_PATH || 'bitcoin-cli'

function check_wallet() {
    if (!process.env.BITCOIN_WALLET) {
        throw new Error(`BITCOIN_WALLET must be set in .env`)
    }
}
function list_unspent() {
    check_wallet()
    const unspents = JSON.parse(child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} listunspent`))
    return unspents
}

module.exports = {
    list_unspent
}
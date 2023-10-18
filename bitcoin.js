const child_process = require('child_process')
const bitcoin_command = process.env.BITCOIN_CLI_PATH || 'bitcoin-cli'

function check_wallet() {
    if (!process.env.BITCOIN_WALLET) {
        throw new Error(`BITCOIN_WALLET must be set in .env`)
    }
}
function listunspent() {
    check_wallet()
    const unspents = JSON.parse(child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} listunspent 0`))
    return unspents
}

function utxoupdatepsbt({ psbt }) {
    check_wallet()
    const resp = child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} utxoupdatepsbt '${psbt}'`)
    return Buffer.from(resp).toString('base64')
}

function walletprocesspsbt({ psbt }) {
    check_wallet()
    return JSON.parse(child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} walletprocesspsbt '${psbt}'`))
}

function finalizepsbt({ psbt }) {
    check_wallet()
    return JSON.parse(child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} finalizepsbt '${psbt}'`))
}

function testmempoolaccept({ hex }) {
    check_wallet()
    return JSON.parse(child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} testmempoolaccept '["${hex}"]'`))
}

module.exports = {
    listunspent,
    utxoupdatepsbt,
    walletprocesspsbt,
    finalizepsbt,
    testmempoolaccept
}
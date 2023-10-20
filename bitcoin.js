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
    return resp.toString('utf8').trim()
}

function walletprocesspsbt({ psbt }) {
    check_wallet()
    return JSON.parse(child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} walletprocesspsbt '${psbt}' true "ALL"`))
}

function finalizepsbt({ psbt, extract = true }) {
    check_wallet()
    return JSON.parse(child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} finalizepsbt '${psbt}' ${extract}`))
}

function testmempoolaccept({ hex }) {
    check_wallet()
    return JSON.parse(child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} testmempoolaccept '["${hex}"]'`))
}

function sendrawtransaction({ hex }) {
    check_wallet()
    const resp = child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} sendrawtransaction '${hex}'`)
    return resp.toString('utf8').trim()
}

function decodepsbt({ psbt }) {
    const resp = JSON.parse(child_process.execSync(`${bitcoin_command} decodepsbt '${psbt}'`))
    return resp
}

function listtransactions() {
    check_wallet()
    const resp = JSON.parse(child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} listtransactions`))
    return resp
}

function getrawtransaction({ txid, verbose }) {
    const resp = JSON.parse(child_process.execSync(`${bitcoin_command} getrawtransaction '${txid}' ${verbose}`))
    return resp
}

module.exports = {
    listunspent,
    utxoupdatepsbt,
    walletprocesspsbt,
    finalizepsbt,
    testmempoolaccept,
    sendrawtransaction,
    decodepsbt,
    listtransactions,
    getrawtransaction
}
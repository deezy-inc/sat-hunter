const child_process = require('child_process')
const bitcoin_command = process.env.BITCOIN_CLI_PATH || 'bitcoin-cli'

function check_wallet() {
    if (!process.env.BITCOIN_WALLET) {
        throw new Error('BITCOIN_WALLET must be set in .env')
    }
}
function listunspent() {
    check_wallet()
    const unspents = JSON.parse(
        child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} listunspent 0`)
    )
    return unspents
}

function utxoupdatepsbt({ psbt }) {
    check_wallet()
    const resp = child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} utxoupdatepsbt '${psbt}'`)
    return resp.toString('utf8').trim()
}

function walletprocesspsbt({ psbt, bitcoin_wallet = process.env.BITCOIN_WALLET }) {
    check_wallet()
    return JSON.parse(
        child_process.execSync(`${bitcoin_command} -rpcwallet=${bitcoin_wallet} walletprocesspsbt '${psbt}' true "ALL"`)
    )
}

function finalizepsbt({ psbt, extract = true }) {
    check_wallet()
    // When extract is true, it returns something like { hex: 'someHex', complete: true }
    // When extract is false, it returns something like: { psbt: 'someBase64', complete: true }
    return JSON.parse(
        child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} finalizepsbt '${psbt}' ${extract}`)
    )
}

function testmempoolaccept({ hex }) {
    check_wallet()
    return JSON.parse(
        child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} testmempoolaccept '["${hex}"]'`)
    )
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

function listtransactions({ label = '"*"', count = 10 }) {
    check_wallet()
    const resp = JSON.parse(
        child_process.execSync(`${bitcoin_command} -rpcwallet=${process.env.BITCOIN_WALLET} listtransactions ${label} ${count}`)
    )
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
    getrawtransaction,
}

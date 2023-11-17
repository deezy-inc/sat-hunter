const child_process = require('child_process')
const axios = require('axios')
const { getAddressInfo } = require('bitcoin-address-validation');

async function make_rpc_call(method, params = []) {
    if (!process.env.WASABI_WALLET_NAME || !process.env.WASABI_RPC_USER || !process.env.WASABI_RPC_PASSWORD) {
        throw new Error(`WASABI_WALLET_NAME, WASABI_RPC_USER, and WASABI_RPC_PASSWORD must be set in .env`)
    }
    try {
        const data = {
            jsonrpc: '2.0',
            id: '1',
            method,
            params,
        };
        const config = {
            auth: {
                username: process.env.WASABI_RPC_USER,
                password: process.env.WASABI_RPC_PASSWORD
            }
        };
        const response = await axios.post(`http://127.0.0.1:37128/${process.env.WASABI_WALLET_NAME}`, data, config);
        return response.data.result
    } catch (error) {
        console.error('Error making RPC call:', error);
    }
}
async function get_btc_balance() {
    const unspents = await list_unspent_coins()
    let sumSats = unspents.reduce((acc, curr) => acc + curr.amount, 0)
    return sumSats / 100000000
}
async function withdraw({ amount_btc }) {
    console.log(`Withdraw not necessary on wasabi`)
}

async function get_address_info_for_utxo({ txid, index }) {
    const unspents = await list_unspent_coins()
    const utxo = unspents.find(it => it.txid === txid && it.index === index)
    return {
        derivation_path: utxo.keyPath,
        address: utxo.address,
        type: getAddressInfo(utxo.address).type
    }
}

async function get_deposit_address() {
    const { address } = await make_rpc_call('getnewaddress', ['sathunter'])
    return address
}

async function list_unspent_coins() {
    const unspents = await make_rpc_call('listunspentcoins')
    return unspents
}

module.exports = {
    get_btc_balance,
    withdraw,
    get_deposit_address,
    list_unspent_coins,
    get_address_info_for_utxo
}
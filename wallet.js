const {
    listunspent,
    walletprocesspsbt,
    sendrawtransaction,
} = require('./bitcoin')
const axios = require('axios')

const MEMPOOL_API = 'https://mempool.space/api'
const WALLET_TYPE = process.env.BITCOIN_WALLET ? 'core' : 'local'

async function get_utxos_from_mempool_space({ address }) {
    const url = `${MEMPOOL_API}/address/${address}/utxo`
    const { data } = await axios.get(url).catch(err => {
        console.error(err)
        return {}
    })
    return data
}
async function get_utxos() {
    if (WALLET_TYPE === 'core') {
        const unspents = listunspent()
        return unspents.map(it => `${it.txid}:${it.vout}`)
    }
    const address = process.env.LOCAL_WALLET_ADDRESS
    if (!address) {
        throw new Error('LOCAL_WALLET_ADDRESS must be set')
    }
    const unspents = await get_utxos_from_mempool_space({ address })
    if (!unspents) {
        throw new Error('Error reaching mempool api')
    }
    return unspents.map(it => `${it.txid}:${it.vout}`)
}

function sign_transaction({ psbt }) {
    if (WALLET_TYPE === 'core') {
        return walletprocesspsbt({ psbt }).psbt
    }
    throw new Error('Not implemented')
}

async function broadcast_to_mempool_space({ hex }) {
    const url = `${MEMPOOL_API}/tx`
    const { data } = await axios.post(url, hex, { headers: { 'Content-Type': 'text/plain' } }).catch(err => {
        console.error(err)
        return {}
    })
    return data
}

async function broadcast_transaction({ hex }) {
    if (WALLET_TYPE === 'core') {
        return sendrawtransaction({ hex })
    }
    const txid = await broadcast_to_mempool_space({ hex })
    return txid
}

module.exports = {
    get_utxos,
    sign_transaction,
    broadcast_transaction
}
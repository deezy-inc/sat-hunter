const {
    listunspent,
    walletprocesspsbt,
    sendrawtransaction,
} = require('./bitcoin')
const axios = require('axios')
const ecc = require('tiny-secp256k1')
const {BIP32Factory} = require('bip32')
const bip32 = BIP32Factory(ecc)
const bitcoin = require('bitcoinjs-lib')
const bip39 = require('bip39')

bitcoin.initEccLib(ecc)

const MEMPOOL_API = 'https://mempool.space/api'
const WALLET_TYPE = process.env.BITCOIN_WALLET ? 'core' : 'local'
let TWEAKED_CHILD_NODE
const toXOnly = pubKey => (pubKey.length === 32 ? pubKey : pubKey.slice(1, 33));

if (WALLET_TYPE === 'local') {
    // Check validity of seed
    const seed_phrase = process.env.LOCAL_WALLET_SEED
    const seed_buffer = bip39.mnemonicToSeedSync(seed_phrase)
    const hd_node = bip32.fromSeed(seed_buffer)
    const child = hd_node.derivePath(process.env.LOCAL_DERIVATION_PATH || "m/86'/0'/0'/0/0")
    const childXOnlyPubKey = toXOnly(child.publicKey)
    const { address } = bitcoin.payments.p2tr({ internalPubkey: childXOnlyPubKey })
    if (address !== process.env.LOCAL_WALLET_ADDRESS) {
        throw new Error('Local address does not match expected - ensure LOCAL_WALLET_SEED, LOCAL_DERIVATION_PATH, and LOCAL_WALLET_ADDRESS are correct and taproot is used')
    } else {
        console.log(`Local wallet address: ${address}`)
        TWEAKED_CHILD_NODE = child.tweak(
            bitcoin.crypto.taggedHash('TapTweak', childXOnlyPubKey),
        );
    }
}

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
    const psbt_object = bitcoin.Psbt.fromBase64(psbt)
    return psbt_object
        .signAllInputs(TWEAKED_CHILD_NODE)
        .finalizeAllInputs()
        .toBase64()
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
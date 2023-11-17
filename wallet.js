const {
    listunspent,
    walletprocesspsbt,
    sendrawtransaction,
    finalizepsbt,
    listtransactions,
    getrawtransaction
} = require('./bitcoin')
const wasabi = require('./exchanges/wasabi')
const axios = require('axios')
const ecc = require('tiny-secp256k1')
const {BIP32Factory} = require('bip32')
const bip32 = BIP32Factory(ecc)
const bitcoin = require('bitcoinjs-lib')
const bip39 = require('bip39')
const { getAddressInfo } = require('bitcoin-address-validation');
const MEMPOOL_URL = process.env.MEMPOOL_URL || 'https://mempool.space'
const IGNORE_UTXOS_BELOW_SATS = 1000

bitcoin.initEccLib(ecc)

const MEMPOOL_API = `${MEMPOOL_URL}/api`
let local_wallet_type
let WALLET_TYPE
if (process.env.ACTIVE_EXCHANGE === 'wasabi') {
    WALLET_TYPE = 'wasabi'
} else {
    WALLET_TYPE = process.env.BITCOIN_WALLET ? 'core' : 'local'
}

const toXOnly = pubKey => (pubKey.length === 32 ? pubKey : pubKey.slice(1, 33));

function create_root_node(seed_phrase) {
    const seed_buffer = bip39.mnemonicToSeedSync(seed_phrase)
    return bip32.fromSeed(seed_buffer)
}


function get_local_derivation_path() {
    const local_wallet_type = getAddressInfo(process.env.LOCAL_ADDRESS).type
    return process.env.LOCAL_DERIVATION_PATH || `m/8${local_wallet_type === 'p2tr' ? '6' : '4'}'/0'/0'/0/0`
}

function validate_seed(seed_phrase, address, derivation_path) {
    const root_node = create_root_node(seed_phrase)
    const address_type = getAddressInfo(address).type
    const child_node = root_node.derivePath(derivation_path)
    const child_xonly_pubkey = toXOnly(child_node.publicKey)
    let derived_address
    if (address_type === 'p2tr') {
        const p2tr_derived_info = bitcoin.payments.p2tr({ internalPubkey: child_xonly_pubkey })
        derived_address = p2tr_derived_info.address
    } else {
        const p2wpkh_derived_info = bitcoin.payments.p2wpkh({ pubkey: child_node.publicKey })
        derived_address = p2wpkh_derived_info.address
    }
    if (address !== derived_address) {
        throw new Error('Local address does not match expected')
    } else {
        console.log(`Validated wallet address: ${address}`)
    }
}

// Validate seed phrase
if (WALLET_TYPE === 'local') {
    if (!process.env.LOCAL_WALLET_SEED || !process.env.LOCAL_WALLET_ADDRESS) {
        throw new Error('LOCAL_WALLET_SEED and LOCAL_WALLET_ADDRESS must be set')
    }
    validate_seed(process.env.LOCAL_WALLET_SEED, process.env.LOCAL_WALLET_ADDRESS, process.env.LOCAL_DERIVATION_PATH, local_wallet_type)
} else if (WALLET_TYPE === 'wasabi') {
    console.log(`Skipping validation of Wasabi Seed`)
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
        const filtered_unspents = unspents.filter(it => it.amount * 100000000 >= IGNORE_UTXOS_BELOW_SATS)
        const ignored_num = unspents.length - filtered_unspents.length
        if (ignored_num > 0) {
            console.log(`Ignored ${ignored_num} dust unspents below ${IGNORE_UTXOS_BELOW_SATS} sats`)
        }
        return filtered_unspents.map(it => `${it.txid}:${it.vout}`)
    }
    if (WALLET_TYPE === 'wasabi') {
        const unspents = await wasabi.list_unspent_coins()
        return unspents.map(it => `${it.txid}:${it.index}`)
    }
    const address = process.env.LOCAL_WALLET_ADDRESS
    if (!address) {
        throw new Error('LOCAL_WALLET_ADDRESS must be set')
    }
    const unspents = await get_utxos_from_mempool_space({ address })
    if (!unspents) {
        throw new Error('Error reaching mempool api')
    }
    const all_unspents_length = unspents.length
    const filtered_unspents = unspents.filter(it => it.value >= IGNORE_UTXOS_BELOW_SATS)
    const ignored_num = all_unspents_length - filtered_unspents.length
    if (ignored_num > 0) {
        console.log(`Ignored ${ignored_num} dust unspents below ${IGNORE_UTXOS_BELOW_SATS} sats`)
    }
    return filtered_unspents.map(it => `${it.txid}:${it.vout}`)
}

async function get_input_address_info(psbt_object) {
    if (WALLET_TYPE === 'local') {
        const type = getAddressInfo(process.env.LOCAL_WALLET_ADDRESS).type
        return {
            type,
            address: process.env.LOCAL_WALLET_ADDRESS,
            derivation_path: get_local_derivation_path()
        }
    }
    // WALLET_TYPE is wasabi!
    const input_utxo = psbt_object.txInputs[0]
    const txid = input_utxo.hash.reverse().toString('hex')
    const index = input_utxo.index
    const info = await wasabi.get_address_info_for_utxo({ txid, index })
    return {
        type: info.type,
        address: info.address,
        derivation_path: info.derivation_path,
    }
}

async function sign_and_finalize_transaction({ psbt, witnessUtxo }) {
    if (WALLET_TYPE === 'core') {
        const processed_psbt = walletprocesspsbt({ psbt }).psbt
        return finalizepsbt({ psbt: processed_psbt, extract: false }).psbt
    }
    let psbt_object = bitcoin.Psbt.fromBase64(psbt)
    const input_address_info = await get_input_address_info(psbt_object)
    let root_hd_node
    if (WALLET_TYPE === 'wasabi') {
        console.log(`Signing with Wasabi wallet seed`)
        root_hd_node = create_root_node(process.env.WASABI_WALLET_SEED)
    } else {
        console.log(`Signing with Local wallet seed`)
        root_hd_node = create_root_node(process.env.LOCAL_WALLET_SEED)
    }
    const child_node = root_hd_node.derivePath(input_address_info.derivation_path)
    if (input_address_info.type === 'p2tr') {
        const child_xonly_pubkey = toXOnly(child_node.publicKey)
        psbt_object.updateInput(0, {
            tapInternalKey: child_xonly_pubkey,
            witnessUtxo,
        })
        const tweaked_child_node = child_node.tweak(
            bitcoin.crypto.taggedHash('TapTweak', child_xonly_pubkey),
        );
        psbt_object = psbt_object.signInput(0, tweaked_child_node, [bitcoin.Transaction.SIGHASH_ALL])
    } else {
        psbt_object.updateInput(0, {
            bip32Derivation: [
                {
                    masterFingerprint: root_hd_node.fingerprint,
                    path: input_address_info.derivation_path,
                    pubkey: child_node.publicKey
                }
            ]
        })
        psbt_object = psbt_object.signInputHD(0, root_hd_node, [bitcoin.Transaction.SIGHASH_ALL])
    }

    return psbt_object.finalizeAllInputs().toBase64()
    // Note: assumes one input
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

async function get_address_txs({ address }) {
    const url = `${MEMPOOL_API}/address/${address}/txs`
    const { data } = await axios.get(url, {
        maxContentLength: Math.MAX_SAFE_INTEGER,
    }).catch(err => {
        console.error(err)
        return {}
    })
    if (process.env.DEBUG) {
        console.log(data)
    }
    return data || []
}

async function fetch_most_recent_unconfirmed_send() {
    if (WALLET_TYPE === 'core') {
        const recent_transactions = listtransactions()
        const unconfirmed_sends = recent_transactions.filter(it => it.category === 'send' && it.confirmations === 0)
        if (unconfirmed_sends.length === 0) {
            return {}
        }
        // sort by fee ascending
        const tx = unconfirmed_sends.sort((a, b) => a.fee - b.fee)[0]
        const fee = -tx.fee * 100000000
        const tx_info = getrawtransaction({ txid: tx.txid, verbose: true })
        // Assumes one input
        const input = tx_info.vin[0]
        const existing_fee_rate = (fee / tx_info.vsize).toFixed(1)
        return {
            existing_fee_rate,
            input_utxo: `${input.txid}:${input.vout}`,
        }
    } else if (WALLET_TYPE === 'wasabi') {
        throw new Error('Wasabi not supported yet for fetch_most_recent_unconfirmed_send')
    }
    const txs = await get_address_txs({ address: process.env.LOCAL_WALLET_ADDRESS })
    const unconfirmed_sends = txs.filter(it => {
        // Hacky way to find which ones are ours...
        if (it.status.confirmed) return false
        if (it.vin.length !== 1) return false
        for (const output of it.vout) {
            if (output.scriptpubkey_address === process.env.LOCAL_WALLET_ADDRESS) {
                return false
            }
        }
        return true
    })
    console.log(`Found ${unconfirmed_sends.length} unconfirmed sends`)
    if (unconfirmed_sends.length === 0) return {}
    // Sort by fee descending
    const tx = unconfirmed_sends.sort((a, b) => b.fee - a.fee)[0]
    const existing_fee_rate = (tx.fee / (tx.weight / 4)).toFixed(1)
    return {
        existing_fee_rate,
        input_utxo: `${tx.vin[0].txid}:${tx.vin[0].vout}`,
    }
}

module.exports = {
    get_utxos,
    sign_and_finalize_transaction,
    broadcast_transaction,
    fetch_most_recent_unconfirmed_send,
}
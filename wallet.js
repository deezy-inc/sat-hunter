const {
    listunspent,
    walletprocesspsbt,
    sendrawtransaction,
    finalizepsbt,
    listtransactions,
    getrawtransaction
} = require('./bitcoin')
const prompts = require('prompts')
const { decrypt } = require('./encryption')
const axios = require('axios')
const ecc = require('tiny-secp256k1')
const { BIP32Factory } = require('bip32')
const bip32 = BIP32Factory(ecc)
const bitcoin = require('bitcoinjs-lib')
const bip39 = require('bip39')
const { getAddressInfo } = require('bitcoin-address-validation');
const { BTC_to_satoshi } = require('./utils');
const MEMPOOL_URL = process.env.MEMPOOL_URL || 'https://mempool.space'

bitcoin.initEccLib(ecc)

const MEMPOOL_API = `${MEMPOOL_URL}/api`
const WALLET_TYPE = process.env.BITCOIN_WALLET ? 'core' : 'local'
let local_wallet_type
let child_xonly_pubkey
let tweaked_child_node
let root_hd_node
let child_hd_node
let derivation_path
const toXOnly = pubKey => (pubKey.length === 32 ? pubKey : pubKey.slice(1, 33));

const get_min_sat_utxo_limit = () => Number(process.env.IGNORE_UTXOS_BELOW_SATS) || 1001

async function init_wallet() {
    if (WALLET_TYPE === 'local') {
        if ((!process.env.LOCAL_WALLET_SEED && !process.env.LOCAL_WALLET_SEED_ENCRYPTED) || !process.env.LOCAL_WALLET_ADDRESS) {
            throw new Error('LOCAL_WALLET_ADDRESS and LOCAL_WALLET_SEED or LOCAL_WALLET_SEED_ENCRYPTED must be set')
        }
        if (process.env.LOCAL_WALLET_SEED && process.env.LOCAL_WALLET_SEED_ENCRYPTED) {
            throw new Error('Cannot set both LOCAL_WALLET_SEED and LOCAL_WALLET_SEED_ENCRYPTED')
        }
        // Check validity of seed
        let seed_phrase
        if (process.env.LOCAL_WALLET_SEED_ENCRYPTED) {
            const { password } = await prompts({
                type: 'password',
                name: 'password',
                message: 'Enter the password to decrypt the seed phrase:',
            })
            seed_phrase = decrypt(process.env.LOCAL_WALLET_SEED_ENCRYPTED, password)
        } else {
            seed_phrase = process.env.LOCAL_WALLET_SEED
        }
        const seed_buffer = bip39.mnemonicToSeedSync(seed_phrase)
        root_hd_node = bip32.fromSeed(seed_buffer)

        const addresss_info = getAddressInfo(process.env.LOCAL_WALLET_ADDRESS)
        local_wallet_type = addresss_info.type
        if (local_wallet_type !== 'p2tr' && local_wallet_type !== 'p2wpkh') {
            throw new Error('Local wallet address must be p2tr or p2wpkh')
        }
        derivation_path = process.env.LOCAL_DERIVATION_PATH || `m/8${local_wallet_type === 'p2tr' ? '6' : '4'}'/0'/0'/0/0`
        child_hd_node = root_hd_node.derivePath(derivation_path)
        child_xonly_pubkey = toXOnly(child_hd_node.publicKey)
        let address
        if (local_wallet_type === 'p2tr') {
            const p2tr_derived_info = bitcoin.payments.p2tr({ internalPubkey: child_xonly_pubkey })
            address = p2tr_derived_info.address
        } else {
            const p2wpkh_derived_info = bitcoin.payments.p2wpkh({ pubkey: child_hd_node.publicKey })
            address = p2wpkh_derived_info.address
        }
        if (address !== process.env.LOCAL_WALLET_ADDRESS) {
            throw new Error('Local address does not match expected - ensure LOCAL_WALLET_SEED/LOCAL_WALLET_SEED_ENCRYPTED, LOCAL_DERIVATION_PATH, and LOCAL_WALLET_ADDRESS are correct')
        } else {
            console.log(`Local wallet address: ${address}`)
            if (local_wallet_type === 'p2tr') {
                tweaked_child_node = child_hd_node.tweak(
                    bitcoin.crypto.taggedHash('TapTweak', child_xonly_pubkey),
                );
            }
        }
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
    const IGNORE_UTXOS_BELOW_SATS = get_min_sat_utxo_limit();

    if (WALLET_TYPE === 'core') {
        const unspents = listunspent()
        const filtered_unspents = unspents.filter(it => it.amount * 100000000 >= IGNORE_UTXOS_BELOW_SATS)
        const ignored_num = unspents.length - filtered_unspents.length
        if (ignored_num > 0) {
            console.log(`Ignored ${ignored_num} dust unspents below ${IGNORE_UTXOS_BELOW_SATS} sats`)
        }
        return filtered_unspents.map(it => `${it.txid}:${it.vout}`)
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

function sign_and_finalize_transaction({ psbt, witnessUtxo }) {
    if (WALLET_TYPE === 'core') {
        const processed_psbt = walletprocesspsbt({ psbt }).psbt
        return finalizepsbt({ psbt: processed_psbt, extract: false }).psbt
    }
    let psbt_object = bitcoin.Psbt.fromBase64(psbt)
    if (local_wallet_type === 'p2tr') {
        psbt_object.updateInput(0, {
            tapInternalKey: child_xonly_pubkey,
            witnessUtxo,
        })
        psbt_object = psbt_object.signInput(0, tweaked_child_node, [bitcoin.Transaction.SIGHASH_ALL])
    } else {
        psbt_object.updateInput(0, {
            bip32Derivation: [
                {
                    masterFingerprint: root_hd_node.fingerprint,
                    path: derivation_path,
                    pubkey: child_hd_node.publicKey
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

async function broadcast_to_blockstream({ hex }) {
    const url = `https://blockstream.info/api/tx`
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
    if (process.env.BROADCAST_TO_BLOCKSTREAM) {
        await broadcast_to_blockstream({ hex })
    }
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
    const IGNORE_UTXOS_BELOW_SATS = get_min_sat_utxo_limit();

    if (WALLET_TYPE === 'core') {
        const recent_transactions_all_outputs = listtransactions({ count: 200 })
        const all_unconfirmed_sends = recent_transactions_all_outputs.filter(
            it => it.category === 'send' && it.confirmations === 0
        )
        console.log({ all_unconfirmed_sends })
        // Sort by most negative (largest send first)
        const all_unconfirmed_sends_sorted = all_unconfirmed_sends.sort((a, b) => b.amount - a.amount)
        // For a send with multiple outputs (common in an extraction tx), listtransactions() will return an entry for each output
        // in the same tx. So we have many entries referring to the same txid, and should just grab one of them.
        const unique_txids = new Set()
        const unique_unconfirmed_sends = all_unconfirmed_sends_sorted.filter(it => {
            if (unique_txids.has(it.txid)) {
                // This assumes all_unconfirmed_sends_sorted is sorted by biggest (most negative) amounts first
                return false
            }
            unique_txids.add(it.txid)
            return true
        })
        console.log({ unique_unconfirmed_sends })
        const unconfirmed_sends = unique_unconfirmed_sends.filter( it => Math.abs(BTC_to_satoshi(it.amount)) >= IGNORE_UTXOS_BELOW_SATS)
        const num_unconfirmed_send_below_limit = unique_unconfirmed_sends.length - unconfirmed_sends.length
        if (unconfirmed_sends.length === 0) {
            console.log(`Did not find any unconfirmed sends above ${IGNORE_UTXOS_BELOW_SATS} sats`)
            if (num_unconfirmed_send_below_limit > 0) {
                console.log(`Ignored ${num_unconfirmed_send_below_limit} unconfirmed sends below ${IGNORE_UTXOS_BELOW_SATS} sats`)
            }
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
    }

    const txs = await get_address_txs({ address: process.env.LOCAL_WALLET_ADDRESS })
    const unconfirmed_sends = txs.filter(it => {
        // Hacky way to find which ones are ours...
        if (it.status.confirmed) return false
        if (it.vin.length !== 1) return false
        if (it.vin[0].prevout.value < IGNORE_UTXOS_BELOW_SATS) {
            console.log(`Ignoring spent dust input of ${it.vin[0].prevout.value} sats`)
            return false
        }
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
    init_wallet
}
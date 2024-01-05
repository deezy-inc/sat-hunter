const ecc = require('tiny-secp256k1')
const { BIP32Factory } = require('bip32')
const bip32 = BIP32Factory(ecc)
const bitcoin = require('bitcoinjs-lib')
const bip39 = require('bip39')

const derivePath = "m/84'/0'/0'/0/0"

// Generate a random seed
const seed = bip39.generateMnemonic()

// Derive the root key from the seed
const root = bip32.fromSeed(Buffer.from(bip39.mnemonicToSeedSync(seed)))

// Derive the first account's node (BIP84 derivation path for the first account)
const node = root.derivePath("m/84'/0'/0'/0/0")

// Get the Bitcoin p2wpkh address associated with this node
const { address } = bitcoin.payments.p2wpkh({ pubkey: node.publicKey })

process.env.LOCAL_WALLET_SEED = seed
process.env.LOCAL_WALLET_ADDRESS = address
process.env.LOCAL_DERIVATION_PATH = derivePath

const { get_utxos } = require('../wallet')
const { listunspent } = require('../bitcoin')
const axios = require('axios')

jest.mock('../bitcoin')
jest.mock('axios')

describe('get_utxos', () => {
    beforeEach(() => {
        // Reset the mocks before each test
        listunspent.mockReset()
        axios.mockReset()
    })

    test('should return correct utxos for local wallet', async () => {
        delete process.env.BITCOIN_WALLET
        process.env.WALLET_TYPE = 'local'
        axios.get.mockImplementation(() => Promise.resolve({
            data: [
                { txid: 'tx1', vout: 0, value: 100000 },
                { txid: 'tx2', vout: 1, value: 200000 }
            ]
        }))

        const result = await get_utxos()
        expect(result).toEqual(['tx1:0', 'tx2:1'])
    })

    test('should throw error when LOCAL_WALLET_ADDRESS is not set', async () => {
        delete process.env.BITCOIN_WALLET
        delete process.env.LOCAL_WALLET_ADDRESS

        await expect(get_utxos()).rejects.toThrow('LOCAL_WALLET_ADDRESS must be set')
    })

    test('should throw error when mempool api is unreachable', async () => {
        delete process.env.BITCOIN_WALLET
        process.env.LOCAL_WALLET_ADDRESS = 'address'
        axios.get.mockImplementation(() => Promise.reject(new Error('Network error')))

        await expect(get_utxos()).rejects.toThrow('Error reaching mempool api')
    })
})
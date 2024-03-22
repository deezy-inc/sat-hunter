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
const { getMempoolClient } = require('../utils/mempool')

jest.mock('../bitcoin')
jest.mock('../utils/mempool')

describe('get_utxos', () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    describe('Environment variables', () => {
        beforeEach(() => {
            jest.resetModules()
        })

        test('should throw error when LOCAL_WALLET_ADDRESS is not set', async () => {
            delete process.env.BITCOIN_WALLET
            delete process.env.LOCAL_WALLET_ADDRESS

            await expect(get_utxos()).rejects.toThrow('LOCAL_WALLET_ADDRESS must be set')
        })

        test('should throw error when mempool api is unreachable', async () => {
            delete process.env.BITCOIN_WALLET
            process.env.LOCAL_WALLET_ADDRESS = 'address'
            getMempoolClient.mockImplementation(() => ({ get: () => Promise.reject(new Error('Network error')) }))

            await expect(get_utxos()).rejects.toThrow('Error reaching mempool api')
        })

        describe('IGNORE_UTXOS_BELOW_SATS', () => {
            test('should filter utxos below specified limit in IGNORE_UTXOS_BELOW_SATS (lower)', async () => {
                // Given
                getMempoolClient.mockImplementation(() => ({
                    get: () =>
                        Promise.resolve({
                            data: [
                                {
                                    txid: '4fe6b37932bd5ae8cc1b0a407a606c3fb22190005c64abc67f5def792b058190',
                                    vout: 4,
                                    status: {
                                        confirmed: true,
                                        block_height: 831003,
                                        block_hash: '00000000000000000002f23559d46afb2bceff111af5e5cc08c738b44187318a',
                                        block_time: 1708268225,
                                    },
                                    value: 14599,
                                },
                                {
                                    txid: '25b2bf9bfb1b27eb9555a872b4abced233dc2e4b7248ee2373d9a42eac46e25e',
                                    vout: 0,
                                    status: { confirmed: false },
                                    value: 608,
                                },
                            ],
                        }),
                }))

                // When
                process.env.IGNORE_UTXOS_BELOW_SATS = 400

                // Then
                expect(await get_utxos()).toEqual([
                    '4fe6b37932bd5ae8cc1b0a407a606c3fb22190005c64abc67f5def792b058190:4',
                    '25b2bf9bfb1b27eb9555a872b4abced233dc2e4b7248ee2373d9a42eac46e25e:0',
                ])
            })

            test('should filter utxos below specified limit in IGNORE_UTXOS_BELOW_SATS (higher)', async () => {
                // Given
                getMempoolClient.mockImplementation(() => ({
                    get: () =>
                        Promise.resolve({
                            data: [
                                {
                                    txid: '4fe6b37932bd5ae8cc1b0a407a606c3fb22190005c64abc67f5def792b058190',
                                    vout: 4,
                                    status: {
                                        confirmed: true,
                                        block_height: 831003,
                                        block_hash: '00000000000000000002f23559d46afb2bceff111af5e5cc08c738b44187318a',
                                        block_time: 1708268225,
                                    },
                                    value: 14599,
                                },
                                {
                                    txid: '25b2bf9bfb1b27eb9555a872b4abced233dc2e4b7248ee2373d9a42eac46e25e',
                                    vout: 0,
                                    status: { confirmed: false },
                                    value: 608,
                                },
                            ],
                        }),
                }))

                // When
                process.env.IGNORE_UTXOS_BELOW_SATS = 17000

                // Then
                expect(await get_utxos()).toEqual([])
            })

            test('should filter utxos below 1000 (default value for IGNORE_UTXOS_BELOW_SATS)', async () => {
                // Given
                getMempoolClient.mockImplementation(() => ({
                    get: () =>
                        Promise.resolve({
                            data: [
                                {
                                    txid: '4fe6b37932bd5ae8cc1b0a407a606c3fb22190005c64abc67f5def792b058190',
                                    vout: 4,
                                    status: {
                                        confirmed: true,
                                        block_height: 831003,
                                        block_hash: '00000000000000000002f23559d46afb2bceff111af5e5cc08c738b44187318a',
                                        block_time: 1708268225,
                                    },
                                    value: 14599,
                                },
                                {
                                    txid: '25b2bf9bfb1b27eb9555a872b4abced233dc2e4b7248ee2373d9a42eac46e25e',
                                    vout: 0,
                                    status: { confirmed: false },
                                    value: 608,
                                },
                            ],
                        }),
                }))

                // When
                delete process.env.IGNORE_UTXOS_BELOW_SATS

                // Then
                expect(await get_utxos()).toEqual(['4fe6b37932bd5ae8cc1b0a407a606c3fb22190005c64abc67f5def792b058190:4'])
            })
        })
    })

    describe('Local wallet', () => {
        test('should return correct utxos for local wallet', async () => {
            delete process.env.BITCOIN_WALLET
            process.env.WALLET_TYPE = 'local'
            getMempoolClient.mockImplementation(() => ({
                get: () =>
                    Promise.resolve({
                        data: [
                            { txid: 'tx1', vout: 0, value: 100000 },
                            { txid: 'tx2', vout: 1, value: 200000 },
                        ],
                    }),
            }))

            const result = await get_utxos()
            expect(result).toEqual(['tx1:0', 'tx2:1'])
        })
    })
})

describe('fetch_most_recent_unconfirmed_send', () => {
    describe('Core wallet', () => {
        beforeEach(() => {
            jest.resetModules()
            process.env.BITCOIN_WALLET = 'hunter'
        })

        test('should return {} when inputs lower then IGNORE_UTXOS_BELOW_SATS', async () => {
            // Given
            process.env.IGNORE_UTXOS_BELOW_SATS = '1500'
            jest.mock('../bitcoin', () => ({
                listtransactions: jest.fn().mockReturnValue([
                    {
                        category: 'send',
                        confirmations: 0,
                        fee: 0.0000015,
                        amount: -0.0000123,
                    },
                    {
                        category: 'send',
                        confirmations: 0,
                        fee: 0.000002,
                        amount: -0.00001123,
                    },
                ]),
            }))
            const { fetch_most_recent_unconfirmed_send } = require('../wallet')

            // Then
            expect(await fetch_most_recent_unconfirmed_send()).toEqual({})
        })

        test('should return unconfirmed_send when at least one input is higher then IGNORE_UTXOS_BELOW_SATS', async () => {
            // Given
            process.env.IGNORE_UTXOS_BELOW_SATS = '1000'
            jest.mock('../bitcoin', () => ({
                listtransactions: jest.fn().mockReturnValue([
                    {
                        category: 'send',
                        confirmations: 0,
                        fee: 0.000003,
                        amount: -0.0000123,
                        txid: 'a',
                    },
                    {
                        category: 'send',
                        confirmations: 0,
                        fee: 0.0000045,
                        amount: -0.00001123,
                        txid: 'b',
                    },
                ]),
                getrawtransaction: jest.fn().mockReturnValue({
                    in_active_chain: true,
                    hex: 'hex',
                    txid: 'txid',
                    hash: 'txid',
                    size: 1,
                    vsize: 263,
                    weight: 1,
                    version: 1,
                    locktime: 123,
                    vin: [
                        {
                            txid: 'hex',
                            vout: 1,
                            scriptSig: {
                                asm: 'str',
                                hex: 'hex',
                            },
                            sequence: 1,
                            txinwitness: ['hex'],
                        },
                    ],
                    vout: [
                        {
                            value: 1,
                            n: 1,
                            scriptPubKey: {
                                asm: 'str',
                                hex: 'str',
                                reqSigs: 1,
                                type: 'str',
                                addresses: ['str'],
                            },
                        },
                    ],
                    blockhash: 'hex',
                    confirmations: 1,
                    blocktime: 123,
                    time: 1,
                }),
            }))
            const { fetch_most_recent_unconfirmed_send } = require('../wallet')

            // Then
            expect(await fetch_most_recent_unconfirmed_send()).not.toEqual({})
        })

        test('should handle same txid in multiple entries from listransactions', async () => {
            // Given
            process.env.IGNORE_UTXOS_BELOW_SATS = '1500'
            jest.mock('../bitcoin', () => ({
                listtransactions: jest.fn().mockReturnValue([
                    {
                        category: 'send',
                        confirmations: 0,
                        fee: 0.0000015,
                        amount: -0.00000546,
                        txid: 'a',
                    },
                    {
                        category: 'send',
                        confirmations: 0,
                        fee: 0.0000015,
                        amount: -0.01,
                        txid: 'a',
                    },
                    {
                        category: 'send',
                        confirmations: 0,
                        fee: 0.0000015,
                        amount: -0.00000546,
                        txid: 'a',
                    },
                    {
                        category: 'send',
                        confirmations: 0,
                        fee: 0.000002,
                        amount: -0.00001123,
                        txid: 'b',
                    },
                ]),
                getrawtransaction: jest.fn().mockImplementation(({ txid }) => {
                    return {
                        in_active_chain: true,
                        hex: 'hex',
                        txid,
                        hash: txid,
                        size: 1,
                        vsize: 263,
                        weight: 1,
                        version: 1,
                        locktime: 123,
                        vin: [
                            {
                                txid: `input-${txid}`,
                                vout: 1,
                                scriptSig: {
                                    asm: 'str',
                                    hex: 'hex',
                                },
                                sequence: 1,
                                txinwitness: ['hex'],
                            },
                        ],
                        vout: [
                            {
                                value: 1,
                                n: 1,
                                scriptPubKey: {
                                    asm: 'str',
                                    hex: 'str',
                                    reqSigs: 1,
                                    type: 'str',
                                    addresses: ['str'],
                                },
                            },
                        ],
                        blockhash: 'hex',
                        confirmations: 1,
                        blocktime: 123,
                        time: 1,
                    }
                }),
            }))
            const { fetch_most_recent_unconfirmed_send } = require('../wallet')

            // Then
            expect(await fetch_most_recent_unconfirmed_send()).toEqual({
                existing_fee_rate: '-0.6',
                input_utxo: 'input-a:1',
            })
        })
    })
})

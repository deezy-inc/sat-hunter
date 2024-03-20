const child_process = require('node:child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const bitcoin = require('bitcoinjs-lib')
const { BIP32Factory } = require('bip32')
const ecc = require('tiny-secp256k1')

const mockFromBase58 = jest.fn()

jest.mock('bip32', () => ({
    BIP32Factory: () => ({
        fromBase58: mockFromBase58,
    }),
}))
jest.mock('node:child_process')
jest.mock('fs')
jest.mock('os')
jest.mock('path')
jest.mock('bitcoinjs-lib')
jest.mock('bip32')
jest.mock('tiny-secp256k1')
jest.mock('tiny-secp256k1', () => ({
    sign: jest.fn().mockReturnValue('mocked_signature'),
    verify: jest.fn().mockReturnValue(true),
}))

// Setup environment variables
process.env.HSM_CLI_PATH = 'mocked_ckcc'
process.env.USE_HSM = 'true'
process.env.HSM_XPUB = 'mocked_xpub'
process.env.HSM_CHILD_XPUB = 'mocked_child_xpub'
process.env.HSM_DERIVATION_PATH = "m/0'"
process.env.HSM_WALLET_ADDRESS = 'mocked_wallet_address'

const hsm = require('../hsm')

describe('HSM Tests', () => {
    // Save the original process.env to restore it after tests
    const originalEnv = process.env

    beforeEach(() => {
        // Reset process.env to a known state before each test
        jest.resetModules() // This is necessary if your module reads environment variables on import
        process.env = { ...originalEnv } // Copy the original process.env
        jest.clearAllMocks()
    })

    afterAll(() => {
        // Restore the original process.env after all tests
        process.env = originalEnv
    })

    describe('get_hsm_address', () => {
        it('should throw an error if HSM_WALLET_ADDRESS is not set in .env', () => {
            // Delete the HSM_WALLET_ADDRESS to simulate it not being set
            delete process.env.HSM_WALLET_ADDRESS

            // Expect calling get_hsm_address to throw an error
            expect(() => hsm.get_hsm_address()).toThrow('HSM_WALLET_ADDRESS must be set in .env')
        })

        it('should return the HSM wallet address when it is set', () => {
            // Set the HSM_WALLET_ADDRESS to simulate it being correctly set in .env
            const mockAddress = 'mocked_wallet_address'
            process.env.HSM_WALLET_ADDRESS = mockAddress

            // Expect calling get_hsm_address to return the mocked address
            expect(hsm.get_hsm_address()).toBe(mockAddress)
        })
    })

    describe('get_address_from_coldcard', () => {
        it('should return the address from the coldcard', () => {
            child_process.execSync.mockReturnValue('mocked_command_output\n\nmocked_address')
            expect(hsm.get_address_from_coldcard()).toBe('mocked_address')
        })

        it('should return an empty string on error', () => {
            child_process.execSync.mockImplementation(() => {
                throw new Error('mocked_error')
            })
            expect(hsm.get_address_from_coldcard()).toBe('')
        })
    })

    describe('get_xpub_from_coldcard', () => {
        it('should return xpub when command executes successfully', () => {
            // Mock execSync to simulate successful command execution
            const mockXpub =
                'xpub6CUGRUonZSQ4TWtTMmzXdrXDtyPWKi8vhYiY5g7M2MRwZwyQTLcA1qLPLNS3VH8gjRvV3jjvLZ5Ud6oR5QHMAPBGFhMsKEDf8yPQHBUQ6H2'
            child_process.execSync.mockReturnValue(`${mockXpub}`)

            const result = hsm.get_xpub_from_coldcard()
            expect(result).toBe(mockXpub)
        })

        it('should return an empty string and log an error if the command fails', () => {
            // Mock execSync to simulate a command failure
            const mockError = new Error('mocked_error')
            child_process.execSync.mockImplementation(() => {
                throw mockError
            })

            // Optionally, mock console.error if you want to verify it was called
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

            const result = hsm.get_xpub_from_coldcard()
            expect(result).toBe('')
            expect(consoleSpy).toHaveBeenCalledWith(`Error getting xpub: ${mockError.message}`)

            // Clean up
            consoleSpy.mockRestore()
        })
    })

    describe('get_child_xpub_from_coldcard', () => {
        const mockDerivationPath = "m/44'/0'/0'"

        it('should return child xpub when command executes successfully', () => {
            // Mock execSync to simulate successful command execution
            const mockChildXpub =
                'xpub6CUGRUonZSQ4TWtTMmzXdrXDtyPWKi8vhYiY5g7M2MRwZwyQTLcA1qLPLNS3VH8gjRvV3jjvLZ5Ud6oR5QHMAPBGFhMsKEDf8yPQHBUQ6H2'
            child_process.execSync.mockImplementation((command) => {
                if (command.includes(mockDerivationPath)) {
                    return mockChildXpub
                }
                throw new Error('Command did not include the expected derivation path')
            })

            const result = hsm.get_child_xpub_from_coldcard(mockDerivationPath)
            expect(result).toBe(mockChildXpub)
        })

        it('should return an empty string and log an error if the command fails', () => {
            // Mock execSync to simulate a command failure
            const mockError = new Error('mocked_error')
            child_process.execSync.mockImplementation(() => {
                throw mockError
            })

            // Optionally, mock console.error if you want to verify it was called
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

            const result = hsm.get_child_xpub_from_coldcard(mockDerivationPath)
            expect(result).toBe('')
            expect(consoleSpy).toHaveBeenCalledWith(`Error getting child xpub: ${mockError.message}`)

            // Clean up
            consoleSpy.mockRestore()
        })
    })

    describe('sign_psbt_with_coldcard', () => {
        beforeEach(() => {
            jest.clearAllMocks()
            fs.writeFileSync.mockClear()
            fs.unlinkSync.mockClear()
            os.tmpdir.mockReturnValue('/mocked/tmpdir')
            path.join.mockReturnValue('/mocked/tmpdir/psbt_in_mockedid.psbt')
            child_process.execSync.mockReturnValue('mocked_signed_psbt_base64')

            // Mock bitcoinjs-lib and bip32 functionality
            const mockPsbt = {
                updateInput: jest.fn(),
                toBase64: jest.fn().mockReturnValue('mocked_psbt_base64'),
                finalizeAllInputs: jest.fn(),
            }
            bitcoin.Psbt.fromBase64.mockReturnValue(mockPsbt)
            const mockNode = {
                publicKey: Buffer.from([0x02, 0x01]),
                fingerprint: Buffer.from([0x00, 0x01, 0x02, 0x03]),
            }
            const bip32Factory = BIP32Factory(ecc)
            bip32Factory.fromBase58.mockReturnValue(mockNode)
        })

        it('should sign a PSBT and return the signed base64 PSBT', () => {
            const mockPsbt = 'mocked_psbt'
            const signedPsbt = hsm.sign_psbt_with_coldcard(mockPsbt)
            expect(typeof signedPsbt).toBe('string')
            expect(signedPsbt).toBe('mocked_psbt_base64')
        })

        it('should catch, log, and rethrow an error if execSync fails', () => {
            // Mock execSync to simulate throwing an error
            const mockError = new Error('mocked_execSync_error')
            child_process.execSync.mockImplementation(() => {
                throw mockError
            })

            // Optionally, mock console.error to verify it was called
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

            // Attempt to call the function and expect it to throw
            expect(() => hsm.sign_psbt_with_coldcard('mocked_psbt')).toThrow()

            // Verify that console.error was called with the expected message
            expect(consoleSpy).toHaveBeenCalledWith(`execSync error: ${mockError.message}`)

            // Clean up
            consoleSpy.mockRestore()
        })
    })

    describe('sign_message_with_coldcard', () => {
        const mockMessage = 'Hello, world!'
        const mockSigningResult = 'signed_message_result'

        beforeEach(() => {
            // Clear all mocks before each test
            jest.clearAllMocks()
            // Mock child_process.execSync to simulate successful command execution
            child_process.execSync.mockReturnValue(mockSigningResult)
            // Ensure process.env is correctly set for check_wallet
            process.env.USE_HSM = 'true'
            process.env.HSM_XPUB = 'mocked_xpub'
            process.env.HSM_CHILD_XPUB = 'mocked_child_xpub'
            process.env.HSM_DERIVATION_PATH = "m/0'"
        })

        it('should return signing result when command executes successfully', () => {
            const result = hsm.sign_message_with_coldcard(mockMessage)
            expect(result).toBe(mockSigningResult)
            expect(child_process.execSync).toHaveBeenCalledWith(expect.stringContaining(mockMessage))
        })

        it('should call check_wallet and throw an error if environment variables are not set', () => {
            // Delete an environment variable to cause check_wallet to throw an error
            delete process.env.USE_HSM

            // Since check_wallet is called within sign_message_with_coldcard, we expect it to throw
            expect(() => hsm.sign_message_with_coldcard(mockMessage)).toThrow('USE_HSM must be set in .env')

            // Ensure execSync was not called since check_wallet should fail before reaching the execSync call
            expect(child_process.execSync).not.toHaveBeenCalled()
        })

        // Optionally, test logging behavior
        it('should log the signing result', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
            hsm.sign_message_with_coldcard(mockMessage)
            expect(consoleSpy).toHaveBeenCalledWith(`Signing result: ${mockSigningResult}`)
            consoleSpy.mockRestore()
        })
    })

    describe('check_wallet', () => {
        it('should not throw an error when all environment variables are set', () => {
            process.env.USE_HSM = 'true'
            process.env.HSM_XPUB = 'mocked_xpub'
            process.env.HSM_CHILD_XPUB = 'mocked_child_xpub'
            process.env.HSM_DERIVATION_PATH = "m/0'"

            expect(() => hsm.check_wallet()).not.toThrow()
        })

        it('should throw an error if USE_HSM is not set', () => {
            delete process.env.USE_HSM

            expect(() => hsm.check_wallet()).toThrow('USE_HSM must be set in .env')
        })

        it('should throw an error if HSM_XPUB is not set', () => {
            delete process.env.HSM_XPUB

            expect(() => hsm.check_wallet()).toThrow('HSM_XPUB must be set in .env')
        })

        it('should throw an error if HSM_CHILD_XPUB is not set', () => {
            delete process.env.HSM_CHILD_XPUB

            expect(() => hsm.check_wallet()).toThrow('HSM_CHILD_XPUB must be set in .env')
        })

        it('should throw an error if HSM_DERIVATION_PATH is not set', () => {
            delete process.env.HSM_DERIVATION_PATH

            expect(() => hsm.check_wallet()).toThrow('HSM_DERIVATION_PATH must be set in .env')
        })
    })

    describe('get_base64_psbt', () => {
        it('should convert PSBT from hex to base64 format if input is hex', () => {
            // Example PSBT in hex format
            const hexPsbt = '70736274ff0100520200000001aad73931018bd' // Truncated for brevity

            // Expected PSBT in base64 format after conversion
            const expectedBase64Psbt = Buffer.from(hexPsbt, 'hex').toString('base64')

            // Call the function with the hex PSBT
            const result = hsm.get_base64_psbt(hexPsbt)

            // Check if the result matches the expected base64 format
            expect(result).toBe(expectedBase64Psbt)
        })

        it('should return the input as is if it is already in base64 format', () => {
            // Example PSBT already in base64 format
            const base64Psbt = 'cHNidP8BAHEBAAAAAa2nOQEBi7'

            // Call the function with the base64 PSBT
            const result = hsm.get_base64_psbt(base64Psbt)

            // Check if the result matches the input base64 PSBT
            expect(result).toBe(base64Psbt)
        })

        it('should correctly identify and not convert non-hex strings assuming they are base64', () => {
            // Example of a string that is not valid hex
            const nonHexPsbt = 'ThisIsNotHexOrBase64=='

            // Call the function with the non-hex string
            const result = hsm.get_base64_psbt(nonHexPsbt)

            // The function should assume it's base64 and return as is
            expect(result).toBe(nonHexPsbt)
        })
    })
})

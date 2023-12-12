const prompts = require('prompts')
const bip39 = require('bip39')

const { encrypt, decrypt } = require('../encryption')
async function run() {
    const { seed_phrase } = await prompts({
        type: 'text',
        name: 'seed_phrase',
        message: 'Enter the 12 or 24 word seed phrase you want to encrypt:',
    })
    const is_valid = bip39.validateMnemonic(seed_phrase)
    if (!is_valid) {
        throw new Error('Invalid seed phrase')
    }
    const { password } = await prompts({
        type: 'password',
        name: 'password',
        message: 'Enter a password to encrypt the seed phrase with:',
    })
    const { password_confirm } = await prompts({
        type: 'password',
        name: 'password_confirm',
        message: 'Enter the password again:',
    })
    if (password !== password_confirm) {
        throw new Error('Passwords do not match')
    }
    const encrypted = encrypt(seed_phrase, password)
    const decrypted = decrypt(encrypted, password)
    if (decrypted !== seed_phrase) {
        throw new Error('Decrypted seed phrase does not match original')
    }
    console.log('Successfully encrypted seed phrase, add the following line to your .env file and remove LOCAL_WALLET_SEED:\n')
    console.log(`LOCAL_WALLET_SEED_ENCRYPTED=${encrypted}\n`)
}

run()

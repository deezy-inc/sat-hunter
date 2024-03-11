const prompts = require('prompts')
const bip39 = require('bip39')

const { encrypt, decrypt } = require('../encryption')
async function run() {
    const { seed_input } = await prompts({
        type: 'select',
        name: 'seed_input',
        message: 'What seed would you like to encrypt?',
        choices: [
            { title: 'I want to enter a new seed phrase here', value: 'ENTER' },
            { title: 'I want to use the LOCAL_WALLET_SEED that is already in my .env file', value: 'LOCAL' },
        ],
    })
    let seed_phrase
    if (seed_input === 'LOCAL') {
        if (!process.env.LOCAL_WALLET_SEED) {
            console.error('No LOCAL_WALLET_SEED found - make sure you have it set in your .env file')
            return
        }
        seed_phrase = process.env.LOCAL_WALLET_SEED
    } else {
        const { input_seed_phrase } = await prompts({
            type: 'text',
            name: 'input_seed_phrase',
            message: 'Enter the 12 or 24 word seed phrase you want to encrypt:',
        })
        seed_phrase = input_seed_phrase
    }

    const is_valid = bip39.validateMnemonic(seed_phrase)
    if (!is_valid) {
        console.error('Invalid seed phrase')
        return
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
        console.error('Passwords do not match')
        return
    }
    const encrypted = encrypt(seed_phrase, password)
    const decrypted = decrypt(encrypted, password)
    if (decrypted !== seed_phrase) {
        console.error('Decrypted seed phrase does not match original')
        return
    }
    console.log(
        `Successfully encrypted seed phrase, add the following line to your .env file${seed_input === 'LOCAL' ? 'and remove LOCAL_WALLET_SEED' : ''}:\n`
    )
    console.log(`LOCAL_WALLET_SEED_ENCRYPTED=${encrypted}\n`)
}

run()

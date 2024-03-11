const prompts = require('prompts')
const { get_address_from_coldcard, get_xpub_from_coldcard, get_child_xpub_from_coldcard } = require('../hsm')
const { generate_hsm_policy_json } = require('./generate_coldcard_hsm_policy')

require('dotenv').config({
    override: true,
})
;(async () => {
    const address = await get_address_from_coldcard()
    console.log('Checking your coldcard for the address...')
    if (!address) {
        console.error('Coldcard is not connected or is not on HSM mode')
        return
    }
    console.log('Address found:', address)
    const xpub = await get_xpub_from_coldcard()
    const { derivation_path } = await prompts({
        type: 'text',
        name: 'derivation_path',
        message: 'Enter the derivation path for the address:',
        initial: "m/44'/0'/0'/0/0",
    })
    if (!derivation_path) {
        console.error('Derivation path is required')
        return
    }
    const child_xpub = await get_child_xpub_from_coldcard(derivation_path)

    const { generate_policy } = await prompts({
        name: 'generate_policy',
        message: 'Do you want to generate a HSM policy based on your .env file? (y/n)',
        type: 'confirm',
        initial: true,
    })
    let policy
    if (generate_policy) {
        const { custom_period } = await prompts({
            type: 'number',
            name: 'custom_period',
            message: 'How many minutes do you want the policy to last (min 1 minute, max 4320)?',
            initial: 4320,
            style: 'default',
            min: 1,
            max: 4320,
        })
        policy = generate_hsm_policy_json(custom_period, false)
    }
    console.log('Please use this configuration for your .env file:\n')
    console.log(`USE_HSM="true"`)
    console.log(`HSM_WALLET_ADDRESS="${address}"`)
    console.log(`HSM_DERIVATION_PATH="${derivation_path}"`)
    console.log(`HSM_XPUB="${xpub}"`)
    console.log(`HSM_CHILD_XPUB="${child_xpub}"`)
    if (policy) {
        console.log("\nYou can find your policy in the 'hsm_policy.json' file.")
    }
})()

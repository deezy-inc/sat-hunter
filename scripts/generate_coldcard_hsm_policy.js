require('dotenv').config({
    override: true,
})

const fs = require('fs')
const DEFAULT_PERIOD_IN_MINUTES = 4320 // 3 days in minutes
const util = require('util')

// Reference: https://coldcard.com/docs/hsm/rules/#per-period-limit
// get period: (integer) velocity period, in minutes, shared across all the rules
const getPeriod = (custom_period) => {
    try {
        if (!custom_period) throw new Error('No custom period provided')
        const period = parseInt(custom_period)
        if (isNaN(period) || period < 1 || period > 4320) {
            throw new Error('Invalid period provided. Must be between 1 and 4320 minutes (3 days)')
        }
        console.log('Using custom period for HSM policy in minutes:', period)
        return period
    } catch (error) {
        if (error.message !== 'No custom period provided') console.log('Error getting period:', error.message)
        console.log('Using default period for HSM policy in minutes:', DEFAULT_PERIOD_IN_MINUTES, '(3 days)')
        return DEFAULT_PERIOD_IN_MINUTES
    }
}

const split_address = (env_var) => {
    if (!env_var) return []
    try {
        return env_var.split(' ').map((address_item) => {
            const [description, address] = address_item.split(':')
            return {
                address,
                description,
            }
        })
    } catch (error) {
        console.log('Error splitting addresses:', error)
    }
    return []
}

const get_whitelist = () => {
    const tag_by_address = split_address(process.env.TAG_BY_ADDRESS)
    const address_book = split_address(process.env.ADDRESS_BOOK)
    const exchange_addresses = [
        'KRAKEN',
        'COINBASE',
        'COINBASE_EXCHANGE',
        'COINBASE_PRIME',
        'GEMINI',
        'BFX',
        'BINANCE',
        'OKX',
        'BYBIT',
        'KUCOIN',
    ].reduce((acc, curr) => {
        const deposit_address_key = `${curr}_DEPOSIT_ADDRESS`
        const deposit_address = process.env[deposit_address_key]
        if (deposit_address) {
            acc.push({
                address: deposit_address,
                description: deposit_address_key,
            })
        }
        return acc
    }, [])
    const combined_addresses = [
        {
            address: process.env.RARE_SAT_ADDRESS,
            description: 'RARE_SAT_ADDRESS',
        },
        ...tag_by_address,
        ...address_book,
        ...exchange_addresses,
    ].filter((address) => address.address && address.description)

    const unique_addresses = new Set()
    const whitelist = combined_addresses.filter((item_address) => {
        if (unique_addresses.has(item_address.address)) {
            return false
        }
        unique_addresses.add(item_address.address)
        return true
    })

    return whitelist
}

const get_whitelist_rules = () => {
    const whitelistAddresses = get_whitelist().map((item_address) => item_address.address)
    const rules = [
        {
            description: 'Combined Whitelist',
            whitelist: [...new Set(whitelistAddresses)], // Ensure addresses are unique
            per_period: null,
            max_amount: null,
            users: [],
            local_conf: false,
            wallet: null,
        },
    ]
    return rules
}

const generate_hsm_policy_json = (custom_period, print = true) => {
    const period = getPeriod(custom_period)
    const rules = get_whitelist_rules()
    // eslint-disable-next-line no-unused-vars
    const slim_rules = rules.map(({ description, ...attributes }) => attributes)

    // Define your HSM policy structure
    const hsm_policy = {
        notes: 'Sat Hunter HSM Policy',
        period,
        must_log: false, // fail anything we can't log to SD card
        never_log: false, // disable all log generation (even if SD card inserted)
        warnings_ok: true,
        msg_paths: ['any'],
        share_xpubs: ["m/84'/0'/0'/*"],
        share_addrs: ["m/84'/0'/0'/*"],
        priv_over_ux: false, // reduce chattiness of status responses in HSM mode, making UX harder
        allow_sl: 13, //  number of times the storage locker can be read per boot-up
        // Bricking Hazard
        // No changes to firmware, HSM policy, Coldcard settings will be possible—ever again.
        // Not even the master PIN holder can change HSM policy nor escape HSM mode! Firmware upgrades are not possible.
        // boot directly to HSM mode, if defined, six-digit numeric code used to escape boot-to-HSM feature
        boot_to_hsm: null,
        rules: slim_rules,
    }

    const hsm_policy_json = JSON.stringify(hsm_policy, null, 2)
    fs.writeFileSync('./hsm_policy.json', hsm_policy_json)

    if (!print) return hsm_policy

    console.log('HSM policy JSON file has been generated successfully.')
    console.log(util.inspect({ ...hsm_policy, rules }, { depth: null, colors: true }))
}

// Check if the script is being run directly
if (require.main === module) {
    const custom_period = process.argv[2]
    generate_hsm_policy_json(custom_period)
} else {
    module.exports = { generate_hsm_policy_json }
}

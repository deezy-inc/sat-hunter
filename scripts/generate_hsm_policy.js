require('dotenv').config({
    override: true
})
const fs = require('fs')
const WEEK_IN_MINUTES = 1440 * 7 // Seven days in minutes

// Reference: https://coldcard.com/docs/hsm/rules/#per-period-limit
// get period: (integer) velocity period, in minutes, shared across all the rules
const getPeriod = () => {
    try {
        const period = parseInt(process.argv[2])
        console.log('Using custom period for HSM policy in minutes:', period)
        return period
    } catch (error) {
        console.log('Using default period for HSM policy in minutes:', WEEK_IN_MINUTES)
        return WEEK_IN_MINUTES
    }
}

// Extract relevant configurations
const rareSatAddress = process.env.RARE_SAT_ADDRESS

// Define your HSM policy structure
const hsmPolicy = {
    notes: 'Sat Hunter HSM Policy',
    period: getPeriod(),
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
    rules: [
        {
            name: 'Whitelist for Transactions',
            whitelist: [
                rareSatAddress // Use the RARE_SAT_ADDRESS from .env
                // Add more addresses as needed
            ],
            per_period: null,
            max_amount: null,
            users: [],
            local_conf: false,
            wallet: null
        }
    ]
}

// Convert the HSM policy object to a JSON string
const hsmPolicyJson = JSON.stringify(hsmPolicy, null, 2)

// Write the HSM policy JSON to a file
fs.writeFileSync('./hsm_policy.json', hsmPolicyJson)

console.log('HSM policy JSON file has been generated successfully.')
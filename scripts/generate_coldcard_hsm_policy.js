require('dotenv').config({
    override: true
});

const fs = require('fs');
const WEEK_IN_MINUTES = 1440 * 7; // Seven days in minutes

// Reference: https://coldcard.com/docs/hsm/rules/#per-period-limit
// get period: (integer) velocity period, in minutes, shared across all the rules
const getPeriod = () => {
    try {
        const period = parseInt(process.argv[2]);
        console.log('Using custom period for HSM policy in minutes:', period);
        return period;
    } catch (error) {
        console.log('Using default period for HSM policy in minutes:', WEEK_IN_MINUTES);
        return WEEK_IN_MINUTES;
    }
};

const split_address = (env_var) => {
    if (!env_var) return [];
    try {
        return env_var.split(' ').map((address_item) => {
            const [description, address] = address_item.split(':');
            return {
                address,
                description
            };
        });
    } catch (error) {
        console.log('Error splitting addresses:', error);
    }
    return [];
};

const get_whitelist = () => {
    const tag_by_address = split_address(process.env.TAG_BY_ADDRESS);
    const address_book = split_address(process.env.ADDRESS_BOOK);
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
        'KUCOIN'
    ].reduce((acc, curr) => {
        const withdrawal_address_key = `${curr}_WITHDRAWAL_ADDRESS`;
        const withdrawal_address = process.env[withdrawal_address_key];
        if (withdrawal_address) {
            acc.push({
                address: withdrawal_address,
                description: withdrawal_address_key
            });
        }
        const deposit_address_key = `${curr}_DEPOSIT_ADDRESS`;
        const deposit_address = process.env[deposit_address_key];
        if (deposit_address) {
            acc.push({
                address: deposit_address,
                description: deposit_address_key
            });
        }
        return acc;
    }, []);
    const combined_addresses = [
        {
            address: process.env.RARE_SAT_ADDRESS,
            description: 'RARE_SAT_ADDRESS'
        },
        ...tag_by_address,
        ...address_book,
        ...exchange_addresses
    ].filter((address) => address.address && address.description);

    const unique_addresses = new Set();
    const whitelist = combined_addresses.filter((item_address) => {
        if (unique_addresses.has(item_address.address)) {
            return false;
        }
        unique_addresses.add(item_address.address);
        return true;
    });

    return whitelist;
};

const get_whitelist_rules = () => {
    const rules = get_whitelist().map((item_address) => {
        return {
            name: item_address.description,
            whitelist: [item_address.address],
            per_period: null,
            max_amount: null,
            users: [],
            local_conf: false,
            wallet: null
        };
    });
    return rules;
};

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
    rules: get_whitelist_rules()
};

// Convert the HSM policy object to a JSON string
const hsmPolicyJson = JSON.stringify(hsmPolicy, null, 2);

// Write the HSM policy JSON to a file
fs.writeFileSync('./hsm_policy.json', hsmPolicyJson);

console.log('HSM policy JSON file has been generated successfully.');

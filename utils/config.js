const { get_existing_scan_config_by_utxo, process_first_withdrawal_request, save_scan_config } = require('../storage')
const { get_excluded_tags, get_included_tags, get_min_tag_sizes, get_max_tag_ages, get_tag_by_address } = require('./tag')
const VALID_SPLIT_TRIGGERS = ['NEVER', 'ALWAYS', 'NO_SATS']

function get_split_config({ fee_rate }) {
    let split_trigger = null
    let split_target_size_sats = null
    if (process.env.SPLIT_TRIGGER_HIGH_FEE_THRESHOLD && fee_rate > parseFloat(process.env.SPLIT_TRIGGER_HIGH_FEE_THRESHOLD)) {
        console.log('Using high fee split trigger')
        split_trigger = process.env.SPLIT_TRIGGER_HIGH_FEE
        split_target_size_sats = parseInt(process.env.SPLIT_UTXO_SIZE_SATS_HIGH_FEE || 0)
    } else if (
        process.env.SPLIT_TRIGGER_MEDIUM_FEE_THRESHOLD &&
        fee_rate > parseFloat(process.env.SPLIT_TRIGGER_MEDIUM_FEE_THRESHOLD)
    ) {
        console.log('Using medium fee split trigger')
        split_trigger = process.env.SPLIT_TRIGGER_MEDIUM_FEE
        split_target_size_sats = parseInt(process.env.SPLIT_UTXO_SIZE_SATS_MEDIUM_FEE || 0)
    } else if (process.env.SPLIT_TRIGGER) {
        console.log('Using normal split trigger')
        split_trigger = process.env.SPLIT_TRIGGER
        split_target_size_sats = parseInt(process.env.SPLIT_UTXO_SIZE_SATS || 0)
    }
    if (split_trigger) {
        if (!VALID_SPLIT_TRIGGERS.includes(process.env.SPLIT_TRIGGER)) {
            throw new Error(
                `Invalid SPLIT_TRIGGER: ${process.env.SPLIT_TRIGGER}, must be one of ${VALID_SPLIT_TRIGGERS.join(', ')}`
            )
        }
        if (split_trigger !== 'NEVER' && !split_target_size_sats) {
            throw new Error(`SPLIT_TRIGGER is set but SPLIT_UTXO_SIZE_SATS is not set properly for fee rate ${fee_rate}`)
        }
    }
    return { split_trigger, split_target_size_sats }
}

function get_scan_config({ fee_rate, utxo }) {
    // Check if existing saved config
    const existing_config = get_existing_scan_config_by_utxo({ utxo })
    if (existing_config) {
        console.log(`Using existing scan config for ${utxo}`)
        return existing_config
    }
    console.log(`No existing scan config for ${utxo} - getting fresh config`)
    const config = {
        excluded_tags: get_excluded_tags({ fee_rate }),
        included_tags: get_included_tags({ fee_rate }),
        min_tag_sizes: get_min_tag_sizes({ fee_rate }),
        max_tag_ages: get_max_tag_ages({ fee_rate }),
        tag_by_address: get_tag_by_address(),
        split_config: get_split_config({ fee_rate }),
        split_special_ranges: process.env.SPLIT_SPECIAL_RANGES === '1',
    }
    const pending_withdrawal = process_first_withdrawal_request()
    if (pending_withdrawal) {
        config.withdraw_config = pending_withdrawal
    }
    console.log(`Saving scan config for ${utxo}`)
    save_scan_config({ utxo, config })
    return config
}

module.exports = {
    get_split_config,
    get_scan_config,
}

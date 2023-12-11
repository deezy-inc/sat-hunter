const {
    get_existing_scan_config_by_utxo,
    save_scan_config
} = require('./storage')
const VALID_SPLIT_TRIGGERS = ['NEVER', 'ALWAYS', 'NO_SATS']

function get_excluded_tags({ fee_rate }) {
    let configured_excluded_tags = process.env.EXCLUDE_TAGS
    if (process.env.EXCLUDE_TAGS_HIGH_FEE_THRESHOLD && fee_rate > parseFloat(process.env.EXCLUDE_TAGS_HIGH_FEE_THRESHOLD)) {
        console.log(`Using high fee excluded tags`)
        configured_excluded_tags = process.env.EXCLUDE_TAGS_HIGH_FEE
    } else if (process.env.EXCLUDE_TAGS_MEDIUM_FEE_THRESHOLD && fee_rate > parseFloat(process.env.EXCLUDE_TAGS_MEDIUM_FEE_THRESHOLD)) {
        console.log(`Using medium fee excluded tags`)
        configured_excluded_tags = process.env.EXCLUDE_TAGS_MEDIUM_FEE
    }
    if (configured_excluded_tags === '') {
        // Explicitly set empty string means include all tags.
        return []
    }
    if (!configured_excluded_tags) {
        return null
    }
    return configured_excluded_tags
        .trim()
        .split(' ')
        .map((tag) => tag.split('/'))
}

function get_min_tag_sizes({ fee_rate }) {
    let configured_min_tag_sizes = process.env.MIN_TAG_SIZES
    if (process.env.MIN_TAG_SIZES_HIGH_FEE_THRESHOLD && fee_rate >= parseFloat(process.env.MIN_TAG_SIZES_HIGH_FEE_THRESHOLD)) {
        console.log(`Using high fee min tag sizes`)
        configured_min_tag_sizes = process.env.MIN_TAG_SIZES_HIGH_FEE
    } else if (process.env.MIN_TAG_SIZES_MEDIUM_FEE_THRESHOLD && fee_rate >= parseFloat(process.env.MIN_TAG_SIZES_MEDIUM_FEE_THRESHOLD)) {
        console.log(`Using medium fee min tag sizes`)
        configured_min_tag_sizes = process.env.MIN_TAG_SIZES_MEDIUM_FEE
    }
    if (!configured_min_tag_sizes) {
        return null
    }
    return configured_min_tag_sizes.trim().split(' ').reduce((acc, tagSize) => {
        const [tag, size] = tagSize.trim().split(':');
        acc[tag] = parseInt(size);
        return acc;
    }, {});
}

function get_tag_by_address() {
    let configured_tag_by_address = process.env.TAG_BY_ADDRESS
    if (!configured_tag_by_address || configured_tag_by_address.trim() === '') {
        return null
    }
    return configured_tag_by_address.trim().split(' ').reduce((acc, pair_tag_by_address) => {
        const [tag, address] = pair_tag_by_address.trim().split(':');
        acc[tag] = address;
        return acc;
    }, {});
}

function get_included_tags({ fee_rate }) {
    let configured_included_tags = process.env.INCLUDE_TAGS
    if (process.env.INCLUDE_TAGS_HIGH_FEE_THRESHOLD && fee_rate > parseFloat(process.env.INCLUDE_TAGS_HIGH_FEE_THRESHOLD)) {
        console.log(`Using high fee included tags`)
        configured_included_tags = process.env.INCLUDE_TAGS_HIGH_FEE
    } else if (process.env.INCLUDE_TAGS_MEDIUM_FEE_THRESHOLD && fee_rate > parseFloat(process.env.INCLUDE_TAGS_MEDIUM_FEE_THRESHOLD)) {
        console.log(`Using medium fee included tags`)
        configured_included_tags = process.env.INCLUDE_TAGS_MEDIUM_FEE
    }
    if (!configured_included_tags || configured_included_tags.trim() === '') {
        // Explicitly set empty string means excluded_tags has priority.
        return []
    }
    return configured_included_tags
        .trim()
        .split(' ')
        .map((tag) => tag.split('/'))
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function get_split_config({ utxo, fee_rate }) {
    let split_trigger = null
    let split_target_size_sats = null
    if (process.env.SPLIT_TRIGGER_HIGH_FEE_THRESHOLD && fee_rate > parseFloat(process.env.SPLIT_TRIGGER_HIGH_FEE_THRESHOLD)) {
        console.log(`Using high fee split trigger`)
        split_trigger = process.env.SPLIT_TRIGGER_HIGH_FEE
        split_target_size_sats = parseInt(process.env.SPLIT_UTXO_SIZE_SATS_HIGH_FEE || 0)
    } else if (process.env.SPLIT_TRIGGER_MEDIUM_FEE_THRESHOLD && fee_rate > parseFloat(process.env.SPLIT_TRIGGER_MEDIUM_FEE_THRESHOLD)) {
        console.log(`Using medium fee split trigger`)
        split_trigger = process.env.SPLIT_TRIGGER_MEDIUM_FEE
        split_target_size_sats =parseInt(process.env.SPLIT_UTXO_SIZE_SATS_MEDIUM_FEE || 0)
    } else if (process.env.SPLIT_TRIGGER) {
        console.log(`Using normal split trigger`)
        split_trigger = process.env.SPLIT_TRIGGER
        split_target_size_sats = parseInt(process.env.SPLIT_UTXO_SIZE_SATS || 0)
    }
    if (split_trigger) {
        if (!VALID_SPLIT_TRIGGERS.includes(process.env.SPLIT_TRIGGER)) {
            throw new Error(`Invalid SPLIT_TRIGGER: ${process.env.SPLIT_TRIGGER}, must be one of ${VALID_SPLIT_TRIGGERS.join(', ')}`)
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
        excluded_tags: get_excluded_tags({ fee_rate, utxo }),
        included_tags: get_included_tags({ fee_rate, utxo }),
        min_tag_sizes: get_min_tag_sizes({ fee_rate, utxo }),
        tag_by_address: get_tag_by_address({ fee_rate, utxo }),
        split_config: get_split_config({ fee_rate, utxo })
    }
    console.log(`Saving scan config for ${utxo}`)
    save_scan_config({ utxo, config })
    return config
}

module.exports = {
    get_excluded_tags,
    get_min_tag_sizes,
    get_split_config,
    get_included_tags,
    get_tag_by_address,
    sleep,
    get_scan_config
}

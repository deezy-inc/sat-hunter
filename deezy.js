const axios = require('axios')

const BASE_URL = 'https://api.deezy.io/v1'

const VALID_SPLIT_TRIGGERS = ['NEVER', 'ALWAYS', 'NO_SATS']

function check_api_key() {
    if (!process.env.DEEZY_API_KEY) {
        throw new Error('DEEZY_API_KEY must be set')
    }
}
async function post_scan_request({ utxo, exchange_address, rare_sat_address, extraction_fee_rate, excluded_tags = null, included_tags = null, min_tag_sizes = null }) {
    check_api_key()
    if (!process.env.RARE_SAT_ADDRESS) {
        throw new Error('RARE_SAT_ADDRESS must be set')
    }
    const url = `${BASE_URL}/sat-hunting/scan`
    const body = {
        utxo_to_scan: utxo,
        extract: true,
        special_sat_addresses: [
            rare_sat_address
        ],
        regular_funds_addresses: [
            exchange_address
        ],
        extraction_fee_rate,
    }
    if (excluded_tags) {
        body.excluded_tags = excluded_tags
    }
    if (included_tags) {
        body.included_tags = included_tags
    }
    if (min_tag_sizes) {
        body.min_tag_sizes = min_tag_sizes
    }
    if (process.env.SPLIT_TRIGGER) {
        if (!VALID_SPLIT_TRIGGERS.includes(process.env.SPLIT_TRIGGER)) {
            throw new Error(`Invalid SPLIT_TRIGGER: ${process.env.SPLIT_TRIGGER}, must be one of ${VALID_SPLIT_TRIGGERS.join(', ')}`)
        }
        if (!process.env.SPLIT_UTXO_SIZE_SATS) {
            throw new Error('SPLIT_UTXO_SIZE_SATS must be set')
        }
        body.split_trigger = process.env.SPLIT_TRIGGER
        body.split_target_size_sats = parseInt(process.env.SPLIT_UTXO_SIZE_SATS)
        console.log(`Using split_trigger: ${body.split_trigger} with utxo size target: ${body.split_target_size_sats / 100000000} BTC`)
    }
    const { data } = await axios.post(url, body, { headers: { 'x-api-token': process.env.DEEZY_API_KEY } }).catch(err => {
        console.error(err)
        return { data: {} }
    })
    return data
}

async function get_scan_request({ scan_request_id }) {
    check_api_key()
    const url = `${BASE_URL}/sat-hunting/scan/${scan_request_id}`
    const { data } = await axios.get(url, { headers: { 'x-api-token': process.env.DEEZY_API_KEY } }).catch(err => {
        console.error(err)
        return { data: {} }
    })
    return data
}

async function get_user_limits() {
    check_api_key()
    const url = `${BASE_URL}/sat-hunting/user/limits`
    const { data } = await axios.get(url, { headers: { 'x-api-token': process.env.DEEZY_API_KEY } }).catch(err => {
        console.error(err)
        return { data: {} }
    })
    return data
}

module.exports = {
    post_scan_request,
    get_scan_request,
    get_user_limits,
}
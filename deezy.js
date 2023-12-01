const axios = require('axios')

const { get_split_config } = require('./utils')
const BASE_URL = 'https://api.deezy.io/v1'

const VALID_SPLIT_TRIGGERS = ['NEVER', 'ALWAYS', 'NO_SATS']

function check_api_key() {
    if (!process.env.DEEZY_API_KEY) {
        throw new Error('DEEZY_API_KEY must be set')
    }
}
async function post_scan_request({ utxo, exchange_address, rare_sat_address, extraction_fee_rate, excluded_tags = null, included_tags = null, min_tag_sizes = null, tag_by_address = null }) {
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
    if (tag_by_address) {
        body.tag_by_address = tag_by_address
    }
    const { split_trigger, split_target_size_sats } = get_split_config({ fee_rate: extraction_fee_rate })
    if (split_trigger) {
        body.split_trigger = split_trigger
    }
    if (split_target_size_sats) {
        body.split_target_size_sats = split_target_size_sats
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

module.exports = {
    post_scan_request,
    get_scan_request
}
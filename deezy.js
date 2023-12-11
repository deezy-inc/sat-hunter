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
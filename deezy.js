const axios = require('axios')

const BASE_URL = 'https://api.deezy.io/v1'

function check_api_key() {
    if (!process.env.DEEZY_API_KEY) {
        throw new Error('DEEZY_API_KEY must be set')
    }
}
async function post_scan_request(request_body) {
    check_api_key()
    const url = `${BASE_URL}/sat-hunting/scan`
    const { data } = await axios.post(url, request_body, { headers: { 'x-api-token': process.env.DEEZY_API_KEY } }).catch(err => {
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
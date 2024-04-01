const axios = require('axios')
const packageInfo = require('./package.json')

const BASE_URL = process.env.DEEZY_BASE_URL || 'https://api.deezy.io/v1'

// Create an Axios instance
const axiosInstance = axios.create({
    baseURL: BASE_URL,
})

// Use request interceptor to set headers
axiosInstance.interceptors.request.use(
    (config) => {
        // Check API key
        if (!process.env.DEEZY_API_KEY) {
            throw new Error('DEEZY_API_KEY must be set')
        }

        // Set headers
        config.headers['x-api-token'] = process.env.DEEZY_API_KEY
        config.headers['User-Agent'] = `sat-hunter/${packageInfo.version}`

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

async function post_scan_request(request_body) {
    const url = `/sat-hunting/scan`
    const { data } = await axiosInstance.post(url, request_body).catch((err) => {
        console.error(err.data)
        return { data: {} }
    })
    return data
}

async function get_scan_request({ scan_request_id }) {
    const url = `/sat-hunting/scan/${scan_request_id}`
    const { data } = await axiosInstance.get(url).catch((err) => {
        console.error(err.data)
        return { data: {} }
    })
    return data
}

async function get_user_limits() {
    const url = `/sat-hunting/user/limits`
    const { data } = await axiosInstance.get(url).catch((err) => {
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

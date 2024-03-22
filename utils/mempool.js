const axios = require('axios')
const MEMPOOL_URL = process.env.MEMPOOL_URL || 'https://mempool.space'
const MEMPOOL_RETRY_URL = process.env.MEMPOOL_RETRY_URL || 'https://mempool.deezy.io'
const MEMPOOL_RETRY_ATTEMPTS = process.env.MEMPOOL_RETRY_ATTEMPTS || 1

let mempoolClient

const createMempoolClient = () => {
    const mempoolAxios = axios.create({ baseURL: MEMPOOL_URL })
    mempoolAxios.interceptors.response.use(
        (response) => response,
        async (error) => {
            console.error(`Attempted call with URL ${error.config.baseURL + error.config.url} failed: ${error.message}`)

            const originalRequestConfig = error.config
            for (let i = 0; i < MEMPOOL_RETRY_ATTEMPTS; i++) {
                try {
                    const retryConfig = { ...originalRequestConfig, baseURL: MEMPOOL_RETRY_URL }
                    return await axios.request(retryConfig)
                } catch (err) {
                    console.error(
                        `Attempted ${i + 1} call(s) with URL ${err.config.baseURL + err.config.url} failed: ${err.message}`
                    )
                }
            }

            return Promise.reject(error)
        }
    )

    return mempoolAxios
}
const getMempoolClient = () => {
    if (!mempoolClient) {
        mempoolClient = createMempoolClient()
    }

    return mempoolClient
}

module.exports = { getMempoolClient }

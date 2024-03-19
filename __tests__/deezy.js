const axios = require('axios')
const deezy = require('./../deezy')
jest.mock('axios', () => ({
    post: jest.fn(() => {
        if (!process.env.DEEZY_API_KEY) {
            throw new Error('DEEZY_API_KEY must be set')
        } else if (!process.env.RARE_SAT_ADDRESS) {
            throw new Error('RARE_SAT_ADDRESS must be set')
        }

        Promise.resolve({ data: {} })
    }),
    get: jest.fn(() => Promise.resolve({ data: {} })),
}))

describe('deezy', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should throw an error when DEEZY_API_KEY is not set', async () => {
        delete process.env.DEEZY_API_KEY

        await expect(deezy.post_scan_request({ utxo: 'mockUtxo' })).rejects.toThrow('DEEZY_API_KEY must be set')
        await expect(deezy.get_scan_request({ scan_request_id: 'mockId' })).rejects.toThrow('DEEZY_API_KEY must be set')
        await expect(deezy.get_user_limits()).rejects.toThrow('DEEZY_API_KEY must be set')
    })

    it('should throw an error when RARE_SAT_ADDRESS is not set', async () => {
        delete process.env.RARE_SAT_ADDRESS
        process.env.DEEZY_API_KEY = '00000000000000000000000000000000'

        await expect(deezy.post_scan_request({ utxo: 'mockUtxo' })).rejects.toThrow('RARE_SAT_ADDRESS must be set')
    })

    it('should post a scan request', async () => {
        process.env.RARE_SAT_ADDRESS = 'bc1qknfqya5asgwgkl5de36wqvcg65vsrvvs3x0fy0'
        const mockResponse = { data: 'mockData' }
        axios.post.mockResolvedValue(mockResponse)

        const result = await deezy.post_scan_request({ utxo: 'mockUtxo' })

        expect(axios.post).toHaveBeenCalled()
        expect(result).toEqual(mockResponse.data)
    })

    it('should get a scan request', async () => {
        const mockResponse = { data: 'mockData' }
        axios.get.mockResolvedValue(mockResponse)

        const result = await deezy.get_scan_request({ scan_request_id: 'mockId' })

        expect(axios.get).toHaveBeenCalled()
        expect(result).toEqual(mockResponse.data)
    })

    it('should get user limits', async () => {
        const mockResponse = { data: 'mockData' }
        axios.get.mockResolvedValue(mockResponse)

        const result = await deezy.get_user_limits()

        expect(axios.get).toHaveBeenCalled()
        expect(result).toEqual(mockResponse.data)
    })
})

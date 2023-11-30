const { run } = require('./../run.js')
const exchanges = require('./../exchanges/config.js')
const { get_utxos, sign_and_finalize_transaction, broadcast_transaction, fetch_most_recent_unconfirmed_send } = require('./../wallet')
const { post_scan_request, get_scan_request } = require('./../deezy')
const { get_fee_rate } = require('../fees.js')

jest.mock('./../exchanges/config.js')
jest.mock('./../wallet', () => ({
    get_utxos: jest.fn().mockResolvedValue(['utxo1', 'utxo2']),
    fetch_most_recent_unconfirmed_send: jest.fn().mockResolvedValue({ existing_fee_rate: 1, input_utxo: 'utxo' }),
    sign_and_finalize_transaction: jest.fn().mockResolvedValue('signedPsbt'),
    broadcast_transaction: jest.fn().mockResolvedValue('txid'),
}))
jest.mock('./../fees')
jest.mock('./../deezy')
jest.mock('./../notifications.js')
jest.mock('./../utils.js')

describe('run function', () => {
    beforeEach(() => {
        jest.resetAllMocks()
        process.env.ACTIVE_EXCHANGE = 'testExchange'
        exchanges.testExchange = {
            get_deposit_address: jest.fn().mockResolvedValue('testAddress'),
            get_btc_balance: jest.fn().mockResolvedValue(0) // Add this line
        }
        get_fee_rate.mockResolvedValue(1)
        get_utxos.mockResolvedValue(['utxo1', 'utxo2'])
        post_scan_request.mockResolvedValue({ id: 'scanRequestId' })
        get_scan_request.mockResolvedValue({ status: 'COMPLETED', satributes: [], extraction_psbt: 'cHNidP8BAAAAAAD9////8AcAAAAAAAAAAAAAAP////8BAAAAAAABAP////8CAAAAAAA=' })
        sign_and_finalize_transaction.mockResolvedValue('signedPsbt')
        broadcast_transaction.mockResolvedValue('txid')
        fetch_most_recent_unconfirmed_send.mockResolvedValue({ existing_fee_rate: 1, input_utxo: 'utxo' })
    })

    it('should run without errors', async () => {
        await run()
        expect(exchanges.testExchange.get_deposit_address).toHaveBeenCalled()
        expect(get_utxos).toHaveBeenCalled()
        expect(post_scan_request).toHaveBeenCalledTimes(2)
        expect(get_scan_request).toHaveBeenCalledTimes(2)
        expect(sign_and_finalize_transaction).toHaveBeenCalledTimes(2)
        expect(broadcast_transaction).toHaveBeenCalledTimes(2)
    })
})

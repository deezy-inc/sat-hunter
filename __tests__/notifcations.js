const { sendNotifications } = require('./../notifications/index')

describe('notifications', () => {
    it('should duplicate messages without a type', async () => {
        let error = await sendNotifications('test message')
        expect(error).toBeUndefined()
        error = await sendNotifications('test message')
        expect(error).toBeUndefined()
    })

    it('should duplicate withdrawals with different uid', async () => {
        let error = await sendNotifications('test message', 'withdraw_success', '1')
        expect(error).toBeUndefined()
        error = await sendNotifications('test message', 'withdraw_success', '2')
        expect(error).toBeUndefined()
    })

    it('should not duplicate withdrawals with same uid', async () => {
        let error = await sendNotifications('test message', 'withdraw_success', '1')
        expect(error).toBeUndefined()
        error = await sendNotifications('test message', 'withdraw_success', '1')
        expect(error).toBeDefined()
    })

    it('should not duplicate payment without uid', async () => {
        let error = await sendNotifications('test message', 'payment_req')
        expect(error).toBeUndefined()
        error = await sendNotifications('test message', 'payment_req')
        expect(error).toBeDefined()
    })
})

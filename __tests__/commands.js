const { get_payment_details } = require('./../commands');
const { get_user_limits } = require('./../deezy');
const { satoshi_to_BTC } = require('./../utils');

jest.mock('./../deezy');
jest.mock('./../utils');

describe('get_payment_details', () => {
    it('should return payment details', async () => {
        get_user_limits.mockResolvedValue({
            payment_address: 'test_address',
            amount: '100',
            days: '30',
            subscription_cost: '200',
            one_time_cost: '300',
            user_volume: '400',
        });

        satoshi_to_BTC.mockImplementation((value) => value);

        const result = await get_payment_details();

        expect(result).toEqual({
            payment_details: `
Your current limits and payment info:

BTC Volume Permitted Every 30 Days: 100.
Subscription Cost: 200.
Cost to purchase 1 additional BTC in scan volume: 300 satoshis.
You have scanned 400 BTC so far this billing period.
Payment Address: 
`,
            payment_address: 'test_address',
        });
    });


    it('should return empty string when payment_address is empty', async () => {
        get_user_limits.mockResolvedValue({
            payment_address: '...',
            amount: '100',
            days: '30',
            subscription_cost: '200',
            one_time_cost: '300',
            user_volume: '400',
        });

        satoshi_to_BTC.mockImplementation((value) => value);

        const result = await get_payment_details();

        expect(result).toBe("");
    });
});
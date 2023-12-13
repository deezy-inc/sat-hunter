const { get_payment_details } = require('./../commands');
const { get_user_limits } = require('./../deezy');

jest.mock('./../deezy');

describe('get_payment_details', () => {
    it('should return payment details', async () => {
        get_user_limits.mockResolvedValue({
            payment_address: 'test_address',
            "amount": 40000000000,
            "unit": "sats",
            "days": 30,
            "subscription_cost": 40000000,
            "one_time_cost": 2000,
            "user_volume": 11186624825,
            "remaining_volume": 11186624825,
        });

        const result = await get_payment_details();

        expect(result).toEqual({
            payment_details: `
Scan Volume Remaining: 111.86624825 BTC
Price: 2000 sats / BTC

Tier: 400 BTC per 30 days
Subscription Cost: 0.4 BTC

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

        const result = await get_payment_details();

        expect(result).toBe("");
    });
});
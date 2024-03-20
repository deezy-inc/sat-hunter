const { get_payment_details, parse_tag_limits } = require('./../commands')
const { get_user_limits } = require('./../deezy')

jest.mock('./../deezy')

describe('get_payment_details', () => {
    it('should return payment details', async () => {
        get_user_limits.mockResolvedValue({
            payment_address: 'test_address',
            amount: 40000000000,
            unit: 'sats',
            days: 30,
            subscription_cost: 40000000,
            one_time_cost: 2000,
            user_volume: 11186624825,
            remaining_volume: 11186624825,
        })

        const result = await get_payment_details()

        expect(result).toEqual({
            payment_details: `
Scan Volume Remaining: 111.86624825 BTC
Price: 2000 sats / BTC

Tier: 400 BTC per 30 days
Subscription Cost: 0.4 BTC

Payment Address:
`,
            payment_address: 'test_address',
        })
    })

    it('should return empty string when payment_address is empty', async () => {
        get_user_limits.mockResolvedValue({
            payment_address: '...',
            amount: '100',
            days: '30',
            subscription_cost: '200',
            one_time_cost: '300',
            user_volume: '400',
        })

        const result = await get_payment_details()

        expect(result).toBe('')
    })
})

describe('parse_tag_limits', () => {
    it('default tag limits', async () => {
        expect(
            parse_tag_limits({
                tag_limits_arg: '100',
                default_tag: 'uncommon',
            })
        ).toStrictEqual({
            uncommon: 100,
        })

        expect(
            parse_tag_limits({
                tag_limits_arg: '20',
                default_tag: 'black_uncommon',
            })
        ).toStrictEqual({
            black_uncommon: 20,
        })
    })

    it('multiple tag limits', async () => {
        expect(
            parse_tag_limits({
                tag_limits_arg: 'uncommon:10,alpha:0',
                default_tag: 'uncommon',
            })
        ).toStrictEqual({
            uncommon: 10,
            alpha: 0,
        })

        expect(
            parse_tag_limits({
                tag_limits_arg: 'pizza:100,palindrome:0,name_palindrome:0',
                default_tag: 'pizza',
            })
        ).toStrictEqual({
            pizza: 100,
            palindrome: 0,
            name_palindrome: 0,
        })
    })
})

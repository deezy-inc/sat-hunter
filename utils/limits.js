const { get_user_limits } = require('../deezy')
const { satoshi_to_BTC } = require('./currency')
const get_warning_limits_exceeded = ({ payment_address, tier_info, one_time_cost }) => {
    return `
--------------------------
Sat Hunting limits exceeded.
To purchase more scans, you can send BTC to the following address: ${payment_address}.
Your plan${tier_info}allows purchasing additional volume at a rate of ${one_time_cost} satoshis per 1 BTC of scan volume.
Contact help@deezy.io for questions or to change your plan.
--------------------------
`
}

async function validate_user_limits() {
    const { payment_address, amount, days, one_time_cost } = await get_user_limits()
    const allowed_volume = satoshi_to_BTC(amount) // We are using satoshis in the DB as default
    const tier_info = allowed_volume > 0 ? ` allows ${allowed_volume} BTC per ${days} days and ` : ''
    const msg = get_warning_limits_exceeded({ payment_address, tier_info, one_time_cost })
    return msg
}

module.exports = {
    validate_user_limits,
}

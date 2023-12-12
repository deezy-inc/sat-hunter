const { get_user_limits } = require("./deezy")
const { satoshi_to_BTC } = require("./utils")

const get_payment_details = async () => {
    const {
        payment_address = "...",
        amount: _amount = "0",
        days = "...",
        subscription_cost: _subscription_cost = "0",
        one_time_cost = "0",
        user_volume: _user_volume = "0",
    } = await get_user_limits()

    if (payment_address === "...") {
        return ""
    }

    const subscription_cost = satoshi_to_BTC(_subscription_cost)
    const user_volume = satoshi_to_BTC(_user_volume)
    const amount = satoshi_to_BTC(_amount)

    const payment_details = `
Your current limits and payment info:

Volume Permitted Every ${days} Days: ${amount} BTC.
Subscription Cost: ${subscription_cost} BTC.
Cost to purchase 1 additional BTC in scan volume: ${one_time_cost} satoshis.
You have scanned ${user_volume} BTC so far this billing period.
Payment Address: 
`

    return {
        payment_details, payment_address
    }
}

module.exports = {
    get_payment_details
}
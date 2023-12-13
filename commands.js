const { get_user_limits } = require("./deezy")
const { satoshi_to_BTC } = require("./utils")

const get_payment_details = async () => {
    const {
        payment_address = "...",
        amount: _amount = "0",
        days = "...",
        subscription_cost: _subscription_cost = "0",
        one_time_cost = "0",
        remaining_volume: _remaining_volume = "0",
    } = await get_user_limits()

    if (payment_address === "...") {
        return ""
    }

    const subscription_cost = satoshi_to_BTC(_subscription_cost)
    const remaining_volume = satoshi_to_BTC(_remaining_volume)
    const amount = satoshi_to_BTC(_amount)

    const unlimitedTier = amount < 0
    const remainingAmountText = unlimitedTier ? 'unlimited' : remaining_volume
    const amountText = unlimitedTier ? 'unlimited' : amount
    const relevantTier = amount > 0

    const scanVolumeText = `Scan Volume Remaining: ${remainingAmountText} BTC\n`
    const priceText = !unlimitedTier ? `Price: ${one_time_cost} sats / BTC\n` : ''
    const tierText = relevantTier ? `Tier: ${amountText} BTC per ${days} days\n` : ''
    const subscriptionText = relevantTier ? `Subscription Cost: ${subscription_cost} BTC\n` : ''

    const payment_details = `
${scanVolumeText}${priceText}
${tierText}${subscriptionText}
Payment Address:
`

    return {
        payment_details, payment_address
    }
}

module.exports = {
    get_payment_details
}
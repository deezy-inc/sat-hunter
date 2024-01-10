const { get_user_limits } = require("./deezy")
const { save_withdraw_request } = require("./storage")
const { satoshi_to_BTC, get_address_by_name } = require("./utils")

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

const create_withdraw_request = async (name, amount) => {
    const address_book = get_address_by_name()

    if (!address_book) {
        throw new Error(`No address book found`)
    }

    if (!address_book[name]) {
        throw new Error(`No address found for ${name}`)
    }

    try {
        save_withdraw_request(address_book[name], amount);
    } catch (err) {
        console.log(`Error saving withdrawal request: ${err}`);
        console.error(err);
    }

    const withdrawal_details = `Withdrawal request created for ${name}: ${amount} satoshis`

    return {
        withdrawal_details
    }
}

module.exports = {
    get_payment_details,
    create_withdraw_request
}
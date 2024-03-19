const { get_user_limits, post_scan_request, get_scan_request } = require('./deezy')
const { save_withdraw_request, save_bulk_transfer } = require('./storage')
const { satoshi_to_BTC, get_address_by_name, validate_user_limits, get_success_scan_address_file } = require('./utils')

const get_payment_details = async () => {
    const {
        payment_address = '...',
        amount: _amount = '0',
        days = '...',
        subscription_cost: _subscription_cost = '0',
        one_time_cost = '0',
        remaining_volume: _remaining_volume = '0',
    } = await get_user_limits()

    if (payment_address === '...') {
        return ''
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
        payment_details,
        payment_address,
    }
}

const create_withdraw_request = async (name, amount) => {
    const address_book = get_address_by_name()

    if (!address_book) {
        throw new Error('No address book found')
    }

    if (!address_book[name]) {
        throw new Error(`No address found for ${name}`)
    }

    try {
        save_withdraw_request(address_book[name], amount)
    } catch (err) {
        console.log(`Error saving withdrawal request: ${err}`)
        console.error(err)
    }

    const btc_amount = satoshi_to_BTC(amount)

    const withdrawal_details = `Withdrawal request created for ${name}: ${btc_amount} BTC`

    return {
        withdrawal_details,
    }
}

async function loop_check_bulk_transfer(scan_request_id) {
    return new Promise((resolve, reject) => {
        const intervalId = setInterval(async () => {
            try {
                const info = await get_scan_request({ scan_request_id })
                console.log(`Scan request with id: ${scan_request_id} has status: ${info.status}`)

                if (info.status === 'FAILED_LIMITS_EXCEEDED') {
                    const user_limits_message = await validate_user_limits()
                    console.log(user_limits_message)
                    clearInterval(intervalId) // Stop the interval before throwing an error
                    throw new Error(user_limits_message)
                }

                if (info.status === 'FAILED') {
                    const message = `Scan request with id: ${scan_request_id} failed`
                    console.log(message)
                    clearInterval(intervalId) // Stop the interval before throwing an error
                    throw new Error(message)
                }

                if (info.status === 'COMPLETED') {
                    clearInterval(intervalId) // Stop the interval
                    save_bulk_transfer(scan_request_id, info)
                    resolve() // Resolve the promise
                }
            } catch (err) {
                console.log(`Error checking bulk transfer with id: ${scan_request_id}: ${err.message}`)
                clearInterval(intervalId) // Ensure the interval is cleared on error
                reject(err) // Reject the promise
            }
        }, 1000) // Check every second
    })
}

function parse_tag_limits({ tag_limits_arg, default_tag }) {
    const tag_limits_object = {}
    if (isNaN(parseInt(tag_limits_arg)) {
        const entries = tag_limits_arg.split(',')
        for (const entry of entries) {
            const [tag, num_str] = entry.split(':')
            entry[tag] = parseInt(num_str)
            if (isNaN(entry[tag])) {
                throw new Error(`Invalid tag limit: ${entry}`)
            }
        }
    } else {
        tag_limits_object[default_tag] = parseInt(tag_limits_arg)
    }
    return tag_limits_object
}

const bulk_transfer = async (
    p_from_address,
    p_to_address,
    p_tag_to_extract,
    p_tag_limits,
    p_fee_rate,
    callbackMessage
) => {
    const tag_limits = parse_tag_limits({ tag_limits_arg: p_tag_limits, default_tag: p_tag_to_extract })
    try {
        if (!p_from_address || !p_to_address || !p_tag_to_extract || !tag_limits || !p_fee_rate) {
            console.log(`
Usage: hunter:bulk-transfer [from_address] [to_address] [tag_to_extract] [tag_limits] [fee_rate]

- from_address: The blockchain address from which the tags will be extracted. This should be a valid address from which you have permission to transfer.
- to_address: The destination blockchain address to which the tags will be sent. Ensure this address is correct to avoid loss of assets.
- tag_to_extract: The specific tag or identifier of the assets to be transferred.
- tag_limits: The number of tags or assets to send to the destination address. This can either be a single positive integer, or a string like "uncommon:25,alpha:0" to set limits for multiple tags.
- fee_rate: The fee rate for the transaction in satoshis per virtual byte (sat/vbyte). This rate affects how quickly the transaction is processed by the network.

Examples:

hunter:bulk-transfer 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa 3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy uncommon 100 30

This command will transfer 100 uncommon tags from address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa to 3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy with a fee rate of 30 sat/vbyte.

hunter:bulk-transfer 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa 3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy uncommon "uncommon:50,alpha:0" 30

This command will transfer 50 uncommons (none of which are alpha) from address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa to 3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy with a fee rate of 30 sat/vbyte.
`)
            return { message: 'Missing or invalid arguments. Please refer to the usage information above.' }
        }
        console.log('Bulk transfer called')

        const fee_rate = parseFloat(p_fee_rate)
        if (isNaN(fee_rate) || fee_rate <= 0) {
            throw new Error(`fee_rate must be a positive number, got ${p_fee_rate}`)
        }

        console.log(`Will use fee rate of ${fee_rate} sat/vbyte`)

        const request_body = {
            address_to_scan: p_from_address,
            extract: true,
            regular_funds_addresses: [p_from_address],
            special_sat_addresses: [p_to_address],
            extraction_fee_rate: fee_rate,
            tag_limits,
            included_tags: [[p_tag_to_extract]],
        }

        const response = await post_scan_request(request_body)

        if (!response || Object.keys(response).length === 0 || !response.id) {
            throw new Error('No response from deezy')
        }

        const scan_request_id = response.id

        if (callbackMessage) {
            await callbackMessage(
                `Bulk transfer created with id: ${scan_request_id}. Some transfers may take a while. Please see terminal logs to track progress...`
            )
        }

        await loop_check_bulk_transfer(scan_request_id)

        console.log(`Bulk transfer created with id: ${scan_request_id}`)

        return {
            message: get_success_scan_address_file({
                scan_request_id,
                transfer_message: `${p_tag_to_extract} with tag limits ${p_tag_limits} and fee rate ${fee_rate} sat/vbyte`,
            }),
        }
    } catch (error) {
        console.error(error)
        return {
            message: `Error in bulk transfer: ${error.message}`,
        }
    }
}

module.exports = {
    get_payment_details,
    create_withdraw_request,
    bulk_transfer,
}

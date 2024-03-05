const { create_withdraw_request } = require('./../commands')
const { BTC_to_satoshi } = require('../utils')

const args = process.argv.slice(2) // Gets the arguments after the script name

// Handle withdrawal request
const name = args[0]
const amount = parseFloat(args[1])
const satoshi_amount = BTC_to_satoshi(amount)

if (isNaN(amount) || satoshi_amount <= 0) {
    console.error('Please enter a valid amount in BTC.')
    process.exit(1)
}

create_withdraw_request(name, satoshi_amount)
    .then(() => console.log(`Withdrawal request created for ${amount} BTC to ${name}.`))
    .catch((err) => console.error(err))

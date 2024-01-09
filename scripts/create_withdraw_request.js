const { create_withdraw_request } = require('./../commands');

const args = process.argv.slice(2); // Gets the arguments after the script name

// Handle withdrawal request
const name = args[0];
const amount = parseInt(args[1]);

if (isNaN(amount) || amount <= 1) {
    console.error("Please enter a valid amount in sats.");
    process.exit(1);
}

create_withdraw_request(name, amount)
    .then(() => console.log(`Withdrawal request created for ${amount} satoshis to ${name}.`))
    .catch(err => console.error(err));
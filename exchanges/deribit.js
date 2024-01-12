const { REST } = require('deribit-nodejs')
const OTP = require('one-time-password')

let client = null;

function init_client() {
    if (!process.env.DERIBIT_KEY || !process.env.DERIBIT_SECRET) {
        throw new Error('DERIBIT_API_SECRET and DERIBIT_API_SECRET must be set')
    }
    // TODO: bug where key is incorrect and turns into an object. Need to figure out why. Also name cannot include _API right now
    // TODO: remove otp-generator from package.json
    client = new REST({
        key: process.env.DERIBIT_KEY,
        secret: process.env.DERIBIT_SECRET
    }
    )
}
async function withdraw({ amount_btc }) {
    if (!client) init_client()
    if (!process.env.DERIBIT_WITHDRAWAL_ADDRESS) {
        throw new Error('DERIBIT_WITHDRAWAL_ADDRESS must be set')
    }
    const response = await client.withdraw({
        currency: 'BTC',
        address: process.env.DERIBIT_WITHDRAWAL_ADDRESS,
        amount: `${amount_btc}`,
        priority: 'insane',
    }).catch(err => {
        console.log(err)
        return {}
    })
    if (response.error) {
        console.log(response)
        throw new Error(`Error withdrawing from Deribit: ${result}`)
    }
    if (response.challenge) {
        const code = OTP.generate(process.env.DERIBIT_OTP_SECRET)
        const responseA = await client.withdraw({
            currency: 'BTC',
            address: process.env.DERIBIT_WITHDRAWAL_ADDRESS,
            amount: `${amount_btc}`,
            priority: 'insane',
            challenge: response.challenge,
            authorization_data: code,
        }).catch(err => {
            console.log(err)
            return {}
        })
        if (responseA.error) {
            console.log(responseA)
            throw new Error(`Error withdrawing from Deribit: ${result}`)
        }
        console.log(responseA)
        return;
    }
    console.log(response)
}


async function get_btc_balance() {
    if (!client) init_client()
    let balance;
    const response = await client.get_account_summary({ currency: 'BTC' }).catch(err => {
        console.log(err)
        return {}
    })
    balance = response.available_withdrawal_funds
    //console.log(response)
    const response2 = await client.get_withdrawals({ currency: 'BTC', count: 1 }).catch(err => {
        console.log(err)
        return {}
    })
    //console.log(response2)
    if (response2.count && response2.count > 0) {
        const maybePendingWithdrawal = response2.data[0]
        if (maybePendingWithdrawal.state != 'completed') {
            balance = balance - maybePendingWithdrawal.amount
        }
    }
    //console.log(response2)
    if (response.error) {
        console.log(response)
        throw new Error(`Error getting Deribit balance`)
    }
    return balance
}

async function get_deposit_address() {
    if (!process.env.DERIBIT_DEPOSIT_ADDRESS) {
        throw new Error('DERIBIT_DEPOSIT_ADDRESS must be set')
    }
    return process.env.DERIBIT_DEPOSIT_ADDRESS
}

module.exports = {
    get_btc_balance,
    withdraw,
    get_deposit_address
}
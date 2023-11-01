const { Spot } = require('@binance/connector');

// Initialize the Binance client with your API key and secret
let client

function init_client() {
    if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
        throw new Error('BINANCE_API_KEY and BINANCE_API_SECRET must be set')
    }
    client = new Spot(process.env.BINANCE_API_KEY, process.env.BINANCE_API_SECRET)
}

async function get_btc_balance() {
    if (!client) {
        init_client()
    }
    const { data } = await client.account().catch(err => {
        console.log(err)
        return {}
    })
    console.log(data)
    const wallet_info = data.balances.filter(it => it.asset === 'BTC')
    console.log(wallet_info[0])
    return parseFloat(wallet_info[0].free)
}

async function withdraw({ amount_btc }) {
    if (!client) {
        init_client()
    }
    if (!process.env.BINANCE_WITHDRAWAL_ADDRESS) {
        throw new Error('BINANCE_WITHDRAWAL_ADDRESS must be set')
    }
    const amount = parseFloat(parseFloat(amount_btc).toFixed(8))
    const { data } = await client.withdraw(
        'BTC',
        process.env.BINANCE_WITHDRAWAL_ADDRESS,
        amount
    ).catch(err => {
        console.log(err)
        throw new Error(err.message)
    })
    console.log(data)
}

async function get_deposit_address() {
    if (!process.env.BINANCE_DEPOSIT_ADDRESS) {
        throw new Error('BINANCE_DEPOSIT_ADDRESS must be set')
    }
    return process.env.BINANCE_DEPOSIT_ADDRESS
}

module.exports = {
    get_deposit_address,
    get_btc_balance,
    withdraw
}
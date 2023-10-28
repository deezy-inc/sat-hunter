const exchanges = require('../exchanges/config.js')
const EXCHANGE = process.argv[2]
const AMOUNT_BTC = parseFloat(process.argv[3])
if (!EXCHANGE) {
    throw new Error('exchange must be set')
}
if (!exchanges[EXCHANGE]) {
    throw new Error(`${EXCHANGE} is not a valid exchange. Available options are ${Object.keys(exchanges).join(', ')}`)
}
if (!AMOUNT_BTC) {
    throw new Error('amount must be set')
}

async function run() {
    const exchange = exchanges[EXCHANGE]
    const resp = await exchange.withdraw({ amount_btc: AMOUNT_BTC }).catch(err => {
        return err.message
    })
    console.log(resp)
    process.exit(0)
}

run()
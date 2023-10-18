const exchanges = require('../exchanges/config.js')
const EXCHANGE = process.argv[2]

if (!EXCHANGE) {
    throw new Error('exchange must be set')
}
if (!exchanges[EXCHANGE]) {
    throw new Error(`${EXCHANGE} is not a valid exchange. Available options are ${Object.keys(exchanges).join(', ')}`)
}

async function run() {
    const exchange = exchanges[EXCHANGE]
    const btc_balance = await exchange.get_btc_balance()
    console.log(`BTC balance on ${EXCHANGE}: ${btc_balance}`)
    process.exit(0)
}

run()


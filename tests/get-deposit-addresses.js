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
    const data = await exchange.get_deposit_addresses()
    console.log(data)
    process.exit(0)
}

run()
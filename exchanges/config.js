const bitfinex = require('./bitfinex')
const kraken = require('./kraken')
const coinbase = require('./coinbase')
const coinbase_prime = require('./coinbase-prime')
const coinbase_exchange = require('./coinbase-exchange')
const gemini = require('./gemini')
const okx = require('./okx')
const kucoin = require('./kucoin')

module.exports = {
    bitfinex,
    kraken,
    coinbase,
    gemini,
    coinbase_exchange,
    coinbase_prime,
    okx,
    kucoin,
}

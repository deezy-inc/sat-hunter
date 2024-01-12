const bitfinex = require('./bitfinex')
const kraken = require('./kraken')
const coinbase = require('./coinbase')
const coinbase_prime = require('./coinbase-prime')
const coinbase_exchange = require('./coinbase-exchange')
const gemini = require('./gemini')
const binance = require('./binance')
const okx = require('./okx')
const bybit = require('./bybit')
const kucoin = require('./kucoin')
const deribit = require('./deribit')

module.exports = {
  bitfinex, kraken, coinbase, gemini, binance, coinbase_exchange, coinbase_prime, okx, bybit, kucoin, deribit
}
const bitfinex = require('./bitfinex')
const kraken = require('./kraken')
const coinbase = require('./coinbase')
const coinbase_exchange = require('./coinbase-exchange')
const gemini = require('./gemini')
const binance = require('./binance')
const okx = require('./okx')
const bybit = require('./bybit')
const kucoin = require('./kucoin')
const wasabi = require('./wasabi')

module.exports = {
  bitfinex, kraken, coinbase, gemini, binance, coinbase_exchange, okx, bybit, kucoin, wasabi
}
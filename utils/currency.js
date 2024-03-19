const satoshi_to_BTC = (satoshi) => parseFloat((satoshi / 100000000).toFixed(8))

const BTC_to_satoshi = (btc) => {
    return Math.floor(btc * 100000000)
}

module.exports = {
    satoshi_to_BTC,
    BTC_to_satoshi,
}

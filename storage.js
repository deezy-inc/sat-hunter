const fs = require('fs')

if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data')
}
if (!fs.existsSync('./data/split-configs')) {
    fs.mkdirSync('./data/split-configs')
}


function get_existing_split_config_by_utxo({ utxo }) {
    const file = `./data/split-configs/${utxo}.json`
    if (!fs.existsSync(file)) {
        return null
    }
    return JSON.parse(fs.readFileSync(file))
}

function save_split_config({ utxo, config }) {
    const file = `./data/split-configs/${utxo}.json`
    fs.writeFileSync(file, JSON.stringify(config))
}

module.exports = {
    get_existing_split_config_by_utxo,
    save_split_config
}
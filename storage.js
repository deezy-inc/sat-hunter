const fs = require('fs')

if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data')
}
if (!fs.existsSync('./data/scan-configs')) {
    fs.mkdirSync('./data/scan-configs')
}

function get_existing_scan_config_by_utxo({ utxo }) {
    const file = `./data/scan-configs/${utxo}.json`
    if (!fs.existsSync(file)) {
        return null
    }
    return JSON.parse(fs.readFileSync(file))
}

function save_scan_config({ utxo, config }) {
    const file = `./data/scan-configs/${utxo}.json`
    fs.writeFileSync(file, JSON.stringify(config))
}

function delete_scan_configs() {
    const dir = './data/scan-configs'
    if (fs.existsSync(dir)) {
        fs.rmdirSync(dir, { recursive: true })
    }
    fs.mkdirSync(dir)
}

module.exports = {
    get_existing_scan_config_by_utxo,
    save_scan_config,
    delete_scan_configs,
}
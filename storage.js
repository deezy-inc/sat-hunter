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

function save_withdraw_request(address, amount) {
    const withdrawRequest = {address, amount}

    const file = `./data/withdraw_requests.json`
    fs.appendFileSync(file, JSON.stringify(withdrawRequest) + '\n')
}

function process_first_withdrawal_request() {
    const filePath = './data/withdraw_requests.json';

    // Read the file content
    let fileContent;
    try {
        fileContent = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        // Handle the error (e.g., file does not exist)
        console.error('Error reading the file:', err);
        return null;
    }

    // Split the content into lines
    const lines = fileContent.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
        console.log('No withdrawal requests to process.');
        return null;
    }

    // Process the first request
    let firstRequest;
    try {
        firstRequest = JSON.parse(lines[0]);
    } catch (err) {
        console.error('Error parsing the first request:', lines[0], err);
        return null;
    }

    // Remove the first line and rewrite the file
    lines.shift();
    fs.writeFileSync(filePath, lines.join('\n'));

    return firstRequest;
}

module.exports = {
    get_existing_scan_config_by_utxo,
    save_scan_config,
    delete_scan_configs,
    save_withdraw_request,
    process_first_withdrawal_request
}
const { completed_bulk_transfer_dir } = require('../constants')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const get_success_scan_address_file = ({ scan_request_id, transfer_message }) =>
    `Bulk transfer of ${transfer_message} have been completed, results can be viewed at ${completed_bulk_transfer_dir}/${scan_request_id}.json`

module.exports = {
    sleep,
    get_success_scan_address_file,
}

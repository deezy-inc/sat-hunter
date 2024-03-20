const { bulk_transfer } = require('../commands')

const from_address_arg = process.argv[2]
const to_address_arg = process.argv[3]
const tag_to_extract_arg = process.argv[4]
const tag_limits_arg = process.argv[5]
const fee_rate_arg = process.argv[6]

bulk_transfer(from_address_arg, to_address_arg, tag_to_extract_arg, tag_limits_arg, fee_rate_arg)
    .then((result) => {
        console.log(result.message)
    })
    .catch((error) => {
        console.log(`Bulk transfer of ${tag_to_extract_arg} failed with error: ${error.message}`)
    })

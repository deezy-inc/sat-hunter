const { bulk_transfer } = require("../commands")

const from_address_arg = process.argv[2]
const to_address_arg = process.argv[3]
const tag_to_extract_arg = process.argv[4]
const num_of_tag_to_send_arg = process.argv[5]
const fee_rate_arg = process.argv[6]

bulk_transfer(from_address_arg, to_address_arg, tag_to_extract_arg, num_of_tag_to_send_arg, fee_rate_arg)
    .then((result) => {
        console.log(
            `Bulk transfer of ${num_of_tag_to_send_arg} ${tag_to_extract_arg} have been created, results can be viewed at data/completed_bulk_transfer/${
                result.bulk_transfer_file_name || "N_A"
            }.json`
        )
    })
    .catch((error) => {
        console.log(`Bulk transfer of ${num_of_tag_to_send_arg} ${tag_to_extract_arg} failed with error: ${error.message}`)
    })

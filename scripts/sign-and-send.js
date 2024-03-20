const { sign_and_send } = require('../commands')

const data_file = process.argv[2]
const bitcoin_core_wallet = process.argv[3]

sign_and_send({ data_file, bitcoin_core_wallet }).catch((error) => {
    console.log(`Sending failed with error: ${error.message}`)
})

const { sign_psbt_with_coldcard } = require('../hsm')

require('dotenv').config({
    override: true,
})

const get_psbt = () => {
    const psbt = process.argv[2]
    if (!psbt) {
        throw new Error('No PSBT provided')
    }
    return psbt
}

console.log(sign_psbt_with_coldcard(get_psbt()))

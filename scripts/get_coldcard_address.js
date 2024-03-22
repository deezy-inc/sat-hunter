const { get_address_from_coldcard } = require('../hsm')

require('dotenv').config({
    override: true,
})
;(async () => {
    let derivation_path = process.argv[2]
    if (!derivation_path) {
        console.error('Usage: npm run hsm:address <derivation_path>')
        console.log("Using default derivation path m/84'/0'/0'/0/0")
        derivation_path = "m/84'/0'/0'/0/0"
    }
    console.log(await get_address_from_coldcard(derivation_path))
})()

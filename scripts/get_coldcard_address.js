const { get_address_from_coldcard } = require('../hsm');

require('dotenv').config({
    override: true
});

(async () => {
    console.log(await get_address_from_coldcard());
})();

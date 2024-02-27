const { get_address_from_hsm } = require('../hsm');

require('dotenv').config({
    override: true
});

(async () => {
    console.log(await get_address_from_hsm());
})();

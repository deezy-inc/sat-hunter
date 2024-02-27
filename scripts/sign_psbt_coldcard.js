const { sign_psbt_with_hsm } = require('../hsm');

require('dotenv').config({
    override: true
});

const get_psbt = () => {
    let psbt = process.argv[2];
    if (!psbt) {
        throw new Error('No PSBT provided');
    }
    return psbt;
};

console.log(sign_psbt_with_hsm(get_psbt()));

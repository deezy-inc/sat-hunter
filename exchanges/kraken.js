const axios = require('axios');
const crypto = require('crypto');

const API_URL = 'https://api.kraken.com';

function CreateAuthenticationSignature(
    apiPrivateKey,
    apiPath,
    endPointName,
    nonce,
    apiPostBodyData
) {
    const apiPost = nonce + apiPostBodyData;
    const secret = Buffer.from(apiPrivateKey, "base64");
    const sha256 = crypto.createHash("sha256");
    const hash256 = sha256.update(apiPost).digest("binary");
    const hmac512 = crypto.createHmac("sha512", secret);
    const signatureString = hmac512
        .update(apiPath + endPointName + hash256, "binary")
        .digest("base64");
    return signatureString;
}

async function QueryPrivateEndpoint(endPointName, inputParameters) {
    const baseDomain = API_URL;
    const privatePath = "/0/private/";
    const apiPublicKey = process.env.KRAKEN_API_KEY
    const apiPrivateKey = process.env.KRAKEN_API_SECRET
    const apiEndpointFullURL = baseDomain + privatePath + endPointName;
    const nonce = Date.now().toString();
    const apiPostBodyData = "nonce=" + nonce + "&" + inputParameters;
    const signature = CreateAuthenticationSignature(
        apiPrivateKey,
        privatePath,
        endPointName,
        nonce,
        apiPostBodyData
    );
    const httpOptions = {
        headers: { "API-Key": apiPublicKey, "API-Sign": signature }, responseType: "application/json",
    };
    const { data } = await axios.post(apiEndpointFullURL, apiPostBodyData, httpOptions)
        .catch((err) => {
            console.log(err)
            return {}
        });
    return JSON.parse(data)
}

function check_api_key() {
    if (!process.env.KRAKEN_API_KEY || !process.env.KRAKEN_API_SECRET) {
        throw new Error('KRAKEN_API_KEY and KRAKEN_API_SECRET must be set')
    }
}

async function get_btc_balance() {
    check_api_key()
    const resp = await QueryPrivateEndpoint('Balance');
    if (resp.error && resp.error.length > 0) {
        throw new Error(resp.error)
    }
    return parseFloat(resp.result['XXBT']);
}

async function withdraw({ amount_btc }) {
    check_api_key()
    if (!process.env.KRAKEN_WITHDRAWAL_ADDRESS_KEY) {
        throw new Error('KRAKEN_WITHDRAWAL_ADDRESS_KEY must be set')
    }
    console.log(`Withdrawing ${amount_btc} BTC to ${process.env.KRAKEN_WITHDRAWAL_ADDRESS_KEY}`)
    try {
        const data = {
            "asset": "XXBT",
            "key": process.env.KRAKEN_WITHDRAWAL_ADDRESS_KEY,
            "amount": amount_btc// in BTC, not sats; ensure amount is in the right format/precision
        };
        console.log(data)
        const resp = await QueryPrivateEndpoint('Withdraw', (new URLSearchParams(data)).toString());
        if (resp.error && resp.error.length > 0) {
            throw new Error(resp.error)
        }
        return resp;
    } catch (error) {
        console.error('An error occurred during withdrawal:', error);
        throw error; // re-throw the error if you want it to propagate
    }
}

async function get_deposit_address() {
    if (!process.env.KRAKEN_DEPOSIT_ADDRESS) {
        throw new Error('KRAKEN_DEPOSIT_ADDRESS must be set')
    }
    return process.env.KRAKEN_DEPOSIT_ADDRESS
}

module.exports = {
    get_btc_balance,
    withdraw,
    get_deposit_address
}
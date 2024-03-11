const axios = require('axios')
const { PUSHOVER_USER, PUSHOVER_TOKEN, PUSHOVER_PRIORITY } = process.env

const PUSHOVER_ENABLED = PUSHOVER_USER && PUSHOVER_TOKEN
const PUSHOVER_ENDPOINT = 'https://api.pushover.net/1/messages.json'
const PUSHOVER_DEFAULT_PRIORITY = 0

const trySendPushover = async (message = undefined) => {
    if (!PUSHOVER_ENABLED || !message) return
    const priority = PUSHOVER_PRIORITY ?? PUSHOVER_DEFAULT_PRIORITY
    const headers = { 'Content-Type': 'application/json' }
    await axios
        .post(
            PUSHOVER_ENDPOINT,
            {
                token: PUSHOVER_TOKEN,
                user: PUSHOVER_USER,
                message,
                priority,
            },
            { headers }
        )
        .catch((err) => {
            console.log(err)
        })
}

module.exports = {
    PUSHOVER_ENABLED,
    trySendPushover,
}

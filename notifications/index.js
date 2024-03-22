const { trySendTelegramMessage, initCommands, TELEGRAM_BOT_ENABLED } = require('./telegram')

const { trySendPushover, PUSHOVER_ENABLED } = require('./pushover')

const lastSentMessages = new Map()

const sendNotifications = async (message = undefined, type = undefined, uid = undefined) => {
    // Check if the type is provided and get the last message of that type
    if (type && lastSentMessages.has(type)) {
        const lastMsg = lastSentMessages.get(type)

        // Check if the uid is defined and compare it
        if (uid && lastMsg.uid === uid) {
            // If they are equal, do not send the message
            return Error(`Message already sent for ${type} ${uid}`)
        } else if (message === lastMsg.message && !uid) {
            // If the message is the same and no uid was provided, do not send it
            return Error(`Message already sent for ${type}`)
        }
    }

    // Proceed to send the message
    if (message) {
        await trySendPushover(message)
        await trySendTelegramMessage(message)
        // Update the last sent message for this type
        if (type) {
            lastSentMessages.set(type, { message, uid })
        }
    }
}

const initNotifications = async () => {
    if (TELEGRAM_BOT_ENABLED) {
        console.log('Telegram bot is enabled')
        await initCommands()
    }
    if (PUSHOVER_ENABLED) console.log('Pushover bot is enabled')
    await sendNotifications(`Starting up sat hunter on ${process.env.ACTIVE_EXCHANGE}`)
}

module.exports = {
    sendNotifications,
    initNotifications,
}

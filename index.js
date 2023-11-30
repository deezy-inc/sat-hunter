const { run, sleep } = require("./run")
const { sendNotifications, TELEGRAM_BOT_ENABLED, PUSHOVER_ENABLED } = require("./notifications")
const LOOP_SECONDS = process.env.LOOP_SECONDS ? parseInt(process.env.LOOP_SECONDS) : 10

async function runLoop() {
    if (TELEGRAM_BOT_ENABLED) console.log(`Telegram bot is enabled`)
    if (PUSHOVER_ENABLED) console.log(`Pushover bot is enabled`)
    await sendNotifications(`Starting up sat hunter on ${process.env.ACTIVE_EXCHANGE}`)

    while (true) {
        await run().catch((err) => {
            console.error(err)
        })
        await sleep(LOOP_SECONDS * 1000)
    }
}

runLoop()

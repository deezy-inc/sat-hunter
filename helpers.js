const { get_version_message } = require('./utils');
const { sendNotifications } = require('./notifications');

/**
 * Sends notifications about the version message
 * @param interval Timeout in milliseconds, default is 24 hours
 * @returns {Promise<void>}
 */
const init_version_check = async (interval = 1000 * 60 * 60 * 24) => {
    console.log('Checking version...')
    console.log(await get_version_message());

    const runPeriodicVersionCheck = async () => {
        const message = await get_version_message();
        await sendNotifications(message, 'version_check');
    }

    await runPeriodicVersionCheck();
    setInterval(runPeriodicVersionCheck, interval);
};

module.exports = {
    init_version_check,
}
const packageJson = require('../package.json');
const { sendNotifications } = require('../notifications');
const axios = require('axios');

const GH_API_URL = 'https://api.github.com';
const REPOSITORY = 'deezy-inc/sat-hunter';


const extractSemanticVersion = (tag) => {
    if (!tag) {
        throw new Error('Tag should be a valid, non-empty string')
    }

    const regex = /\bv?(\d+\.\d+\.\d+)\b/;
    const semanticVersion = tag.match(regex);
    return semanticVersion && semanticVersion[1];
}

const getRemoteLatestRelease = async () => {
    try {
        const response = await axios.get(`${GH_API_URL}/repos/${REPOSITORY}/releases/latest`);
        return response.data;
    } catch (err) {
        throw new Error('Could not retrieve latest release from GitHub');
    }
}

const getVersionMessage = async () => {
    try {
        const localVersion = packageJson.version;
        const latestRelease = await getRemoteLatestRelease()
        const remoteLatestVersion = extractSemanticVersion(latestRelease.tag_name);

        if (localVersion !== remoteLatestVersion) {
            return `New version available ${localVersion} -> ${remoteLatestVersion}, check it out at: \n${latestRelease.html_url}`;
        } else {
            return `You are using the latest version! ${localVersion}`;
        }
    } catch (err) {
        return 'Could not check for new version';
    }
};

/**
 * Sends notifications about the version message
 * @param interval Timeout in milliseconds, default is 24 hours
 * @returns {Promise<void>}
 */
const initVersionCheck = async (interval = 1000 * 60 * 60 * 24) => {
    console.log('Checking version...')
    console.log(await getVersionMessage());

    const runPeriodicVersionCheck = async () => {
        const message = await getVersionMessage();
        await sendNotifications(message, 'version_check');
    }

    await runPeriodicVersionCheck();
    setInterval(runPeriodicVersionCheck, interval);
};

module.exports = {
    initVersionCheck,
};
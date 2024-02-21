const packageJson = require('../package.json');

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
        const response = await fetch(`${GH_API_URL}/repos/${REPOSITORY}/releases/latest`);
        return await response.json();
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
            return `There is a new version available ${localVersion} -> ${remoteLatestVersion}, check it out at: \n${latestRelease.html_url}`;
        } else {
            return `You are using the latest version! ${localVersion}`;
        }
    } catch (err) {
        return 'Could not check if there is a new version available. Please try again later.';
    }
};

module.exports = {
    getVersionMessage,
};
const packageJson = require('../package.json')
const axios = require('axios')

const GH_API_URL = 'https://api.github.com'
const REPOSITORY = 'deezy-inc/sat-hunter'

const extract_semantic_version = (tag) => {
    if (!tag) {
        throw new Error('Tag should be a valid, non-empty string')
    }

    const regex = /\bv?(\d+\.\d+\.\d+)\b/
    const semanticVersion = tag.match(regex)
    return semanticVersion && semanticVersion[1]
}

const get_remote_latest_release = async () => {
    try {
        const response = await axios.get(`${GH_API_URL}/repos/${REPOSITORY}/releases/latest`)
        return response.data
    } catch (err) {
        throw new Error('Could not retrieve latest release from GitHub')
    }
}

const get_version_message = async () => {
    try {
        const localVersion = packageJson.version
        const latestRelease = await get_remote_latest_release()
        const remoteLatestVersion = extract_semantic_version(latestRelease.tag_name)

        if (localVersion !== remoteLatestVersion) {
            return `New version available ${localVersion} -> ${remoteLatestVersion}, check it out at: \n${latestRelease.html_url}`
        } else {
            return `You are using the latest version! ${localVersion}`
        }
    } catch (err) {
        return 'Could not check for new version'
    }
}

module.exports = {
    get_version_message,
}

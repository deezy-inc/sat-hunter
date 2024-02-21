const axios = require('axios');
const { sendNotifications } = require('../../notifications/index.js');
const { initVersionCheck } = require('../../tools/version');

jest.mock('axios');
jest.mock('../../notifications/index.js');

const packageJson = { version: '1.0.0' };
jest.mock('../../package.json', () => (packageJson), { virtual: true });


describe('tools', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('version', () => {
        describe('initVersionCheck', () => {
            test('should send notification about update when local version is different from remote', async () => {
                // Given
                packageJson.version = '1.0.0';
                const remoteVersion = '1.1.1';
                const remoteVersionReleaseUrl = 'https://github.com/deezy-inc/sat-hunter/releases/tag/v1.1.1';
                axios.get.mockResolvedValue({ data: { tag_name: `v${remoteVersion}`, html_url: remoteVersionReleaseUrl } });

                // When
                await initVersionCheck();

                // Then
                expect(sendNotifications).toHaveBeenCalledWith(`New version available 1.0.0 -> ${remoteVersion}, check it out at: \n${remoteVersionReleaseUrl}`, 'version_check');
            });

            test('should send notification about using latest version when local version is equal to remote', async () => {
                // Given
                packageJson.version = '1.1.1';
                const remoteVersion = '1.1.1';
                const remoteVersionReleaseUrl = 'https://github.com/deezy-inc/sat-hunter/releases/tag/v1.1.1';
                axios.get.mockResolvedValue({ data: { tag_name: `v${remoteVersion}`, html_url: remoteVersionReleaseUrl } });

                // When
                await initVersionCheck();

                // Then
                expect(sendNotifications).toHaveBeenCalledWith(`You are using the latest version! ${remoteVersion}`, 'version_check');
            });

            test('should send notification of error when not able to check remote version', async () => {
                // Given
                axios.get.mockRejectedValue();

                // When
                await initVersionCheck();

                // Then
                expect(sendNotifications).toHaveBeenCalledWith(`Could not check for new version`, 'version_check');
            });
        });
    });
});
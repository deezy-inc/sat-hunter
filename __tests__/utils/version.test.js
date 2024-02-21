const axios = require('axios');
const { sendNotifications } = require('../../notifications/index.js');
const { initVersionCheck } = require('../../utils/version');

jest.mock('axios');
jest.mock('../../notifications/index.js');

const tick = () => new Promise(resolve => jest.requireActual('timers').setImmediate(resolve));
const packageJson = { version: '1.0.0' };
jest.mock('../../package.json', () => (packageJson), { virtual: true });

describe('utils', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        axios.get.mockResolvedValue({ data: { tag_name: `v1.0.0`, html_url: 'https://github.com/deezy-inc/sat-hunter/releases/tag/v1.0.0' } });
    });

    describe('version', () => {
        describe('initVersionCheck', () => {
            describe('Notifications', () => {
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

            describe('Execution interval', () => {
                beforeEach(() => {
                    jest.useFakeTimers();
                });

                afterEach(() => {
                    jest.useRealTimers();
                });

                test('should send notification every 24 hours (default)', async () => {
                    // Startup
                    await initVersionCheck();
                    expect(sendNotifications).toHaveBeenCalledTimes(1);

                    // After 24 hours
                    jest.advanceTimersByTime(1000 * 60 * 60 * 24);
                    await tick();
                    expect(sendNotifications).toHaveBeenCalledTimes(2);

                    // After 48 hours
                    jest.advanceTimersByTime(1000 * 60 * 60 * 24);
                    await tick();
                    expect(sendNotifications).toHaveBeenCalledTimes(3);
                })

                test('should send notification every hour (user defined)', async () => {
                    // Startup
                    const oneHour = 1000 * 60 * 60;
                    await initVersionCheck(oneHour);
                    expect(sendNotifications).toHaveBeenCalledTimes(1);

                    // After 1 hour
                    jest.advanceTimersByTime(oneHour);
                    await tick();
                    expect(sendNotifications).toHaveBeenCalledTimes(2);

                    // After 2 hours
                    jest.advanceTimersByTime(oneHour);
                    await tick();
                    expect(sendNotifications).toHaveBeenCalledTimes(3);
                })
            });
        });
    });
});
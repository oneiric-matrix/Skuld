import { appUpdaterService, AppReleaseInfo } from '../../src/services/AppUpdaterService';
import { UpdateNotificationModal } from '../../src/components/UpdateNotificationModal';

describe('AppUpdaterService & UpdateNotificationModal Tests', () => {
  it('exports appUpdaterService singleton and provides current version', () => {
    expect(appUpdaterService).toBeDefined();
    expect(appUpdaterService.getCurrentVersion()).toBe('1.0.0');
  });

  it('handles update check network response gracefully', async () => {
    // Mock global fetch
    const mockRelease = {
      tag_name: 'v1.0.1-nightly',
      created_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      body: 'Performance improvements and bug fixes',
      assets: [
        {
          name: 'Skuld-Nightly.apk',
          browser_download_url: 'https://github.com/oneiric-matrix/Skuld/releases/download/v1.0.1/Skuld-Nightly.apk',
        },
      ],
    };

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRelease),
    });

    const info = await appUpdaterService.checkForUpdates();
    expect(info).not.toBeNull();
    expect(info?.version).toBe('v1.0.1-nightly');
    expect(info?.downloadUrl).toBe(
      'https://github.com/oneiric-matrix/Skuld/releases/download/v1.0.1/Skuld-Nightly.apk'
    );
    expect(info?.isNewer).toBe(true);
  });

  it('handles fetch error or 404 cleanly without crashing', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const info = await appUpdaterService.checkForUpdates();
    expect(info).toBeNull();
  });

  it('triggers download via Linking and validates UpdateNotificationModal', async () => {
    expect(UpdateNotificationModal).toBeDefined();
    expect(typeof UpdateNotificationModal).toBe('function');

    const downloadSuccess = await appUpdaterService.triggerUpdateDownload(
      'https://github.com/oneiric-matrix/Skuld/releases/tag/nightly-latest'
    );
    expect(downloadSuccess).toBe(true);
  });
});

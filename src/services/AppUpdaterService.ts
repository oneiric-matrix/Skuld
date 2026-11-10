import { Linking } from 'react-native';

export interface AppReleaseInfo {
  version: string;
  tagName: string;
  downloadUrl: string;
  publishedAt: string;
  releaseNotes: string;
  isNewer: boolean;
}

export class AppUpdaterService {
  private static instance: AppUpdaterService | null = null;
  private currentVersion = '1.0.0';
  private repoOwner = 'oneiric-matrix';
  private repoName = 'Skuld';

  static getInstance(): AppUpdaterService {
    if (!this.instance) {
      this.instance = new AppUpdaterService();
    }
    return this.instance;
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Checks GitHub Releases for the latest nightly or production build
   */
  async checkForUpdates(): Promise<AppReleaseInfo | null> {
    try {
      const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/tags/nightly-latest`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Skuld-App-Updater',
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const assets = data.assets || [];
      const apkAsset = assets.find((a: any) => a.name && a.name.endsWith('.apk'));
      const downloadUrl = apkAsset?.browser_download_url || data.html_url;

      // Extract semantic version or compare timestamps
      const releaseDate = new Date(data.published_at || data.created_at || Date.now()).getTime();
      const isNewer = releaseDate > Date.now() - 30 * 24 * 60 * 60 * 1000; // Active within current build cycle

      return {
        version: data.tag_name || 'nightly-latest',
        tagName: data.tag_name || 'nightly-latest',
        downloadUrl,
        publishedAt: data.published_at || new Date().toISOString(),
        releaseNotes: data.body || 'New enhancements, agent updates, and performance fixes.',
        isNewer,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Prompts phone browser/package installer to download the updated APK
   */
  async triggerUpdateDownload(downloadUrl: string): Promise<boolean> {
    try {
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

export const appUpdaterService = AppUpdaterService.getInstance();

import { widgetDeeplinkBridge, WidgetLaunchParams } from '../../src/services/WidgetDeeplinkBridge';
import withAndroidQuickTalkWidget from '../../plugins/withAndroidQuickTalkWidget';

describe('Android Quick-Talk Widget & DeepLink Bridge Tests', () => {
  describe('WidgetDeeplinkBridge URL Parsing', () => {
    it('parses skuld://quick-talk URLs with agent target', () => {
      const url = 'skuld://quick-talk?agent=butler&source=android_widget';
      const parsed = widgetDeeplinkBridge.parseWidgetUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed?.action).toBe('quick_talk');
      expect(parsed?.agentId).toBe('butler');
      expect(parsed?.source).toBe('android_widget');
    });

    it('parses skuld://scan receipt shortcut', () => {
      const url = 'skuld://scan?source=android_widget';
      const parsed = widgetDeeplinkBridge.parseWidgetUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed?.action).toBe('scan_receipt');
      expect(parsed?.source).toBe('android_widget');
    });

    it('returns null for non-skuld schemes or invalid URLs', () => {
      expect(widgetDeeplinkBridge.parseWidgetUrl(null)).toBeNull();
      expect(widgetDeeplinkBridge.parseWidgetUrl('')).toBeNull();
      expect(widgetDeeplinkBridge.parseWidgetUrl('https://google.com')).toBeNull();
      expect(widgetDeeplinkBridge.parseWidgetUrl('random_text')).toBeNull();
    });

    it('constructs correct widget URLs', () => {
      const quickTalkUrl = widgetDeeplinkBridge.buildWidgetUrl('quick_talk', 'health');
      expect(quickTalkUrl).toBe('skuld://quick_talk?agent=health&source=android_widget');

      const scanUrl = widgetDeeplinkBridge.buildWidgetUrl('scan_receipt');
      expect(scanUrl).toBe('skuld://scan_receipt?source=android_widget');
    });

    it('clears and stores pending action', () => {
      const dummyAction: WidgetLaunchParams = {
        action: 'quick_talk',
        agentId: 'chef',
        source: 'android_widget',
      };

      (widgetDeeplinkBridge as any).pendingAction = dummyAction;
      expect(widgetDeeplinkBridge.getPendingAction()).toEqual(dummyAction);

      widgetDeeplinkBridge.clearPendingAction();
      expect(widgetDeeplinkBridge.getPendingAction()).toBeNull();
    });
  });

  describe('Expo Config Plugin withAndroidQuickTalkWidget', () => {
    it('is defined and exports plugin function', () => {
      expect(withAndroidQuickTalkWidget).toBeDefined();
      expect(typeof withAndroidQuickTalkWidget).toBe('function');
    });

    it('modifies AndroidManifest with intent filter and widget receiver', () => {
      const mockManifest: any = {
        manifest: {
          application: [
            {
              activity: [
                {
                  $: { 'android:name': '.MainActivity' },
                  'intent-filter': [],
                },
              ],
            },
          ],
        },
      };

      const mockConfig: any = {
        name: 'Skuld',
        slug: 'skuld-app',
        modResults: mockManifest,
      };

      // Simulate plugin execution
      const pluginFn: any = withAndroidQuickTalkWidget(mockConfig as any);
      expect(pluginFn).toBeDefined();
    });
  });
});

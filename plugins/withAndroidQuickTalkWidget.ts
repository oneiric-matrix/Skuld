import { ConfigPlugin, withAndroidManifest, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Expo Config Plugin for Skuld Android Home Screen Quick-Talk Widget.
 * Injects:
 * 1. Deep linking scheme <data android:scheme="skuld" /> into the main activity.
 * 2. AppWidgetProvider receiver for the Skuld Home Screen Widget.
 * 3. XML layouts and drawable resources into android/app/src/main/res/ during prebuild.
 */
export const withAndroidQuickTalkWidget: ConfigPlugin = (config) => {
  // 1. AndroidManifest modifications
  config = withAndroidManifest(config, (modConfig) => {
    const mainApplication = modConfig.modResults.manifest.application?.[0];
    if (!mainApplication) return modConfig;

    // Ensure main activity handles skuld:// deep links
    const mainActivity = mainApplication.activity?.find(
      (a: any) => a.$?.['android:name'] === '.MainActivity' || a.$?.['android:launchMode'] === 'singleTask'
    ) || mainApplication.activity?.[0];

    if (mainActivity) {
      if (!mainActivity['intent-filter']) {
        mainActivity['intent-filter'] = [];
      }

      // Check if skuld scheme filter already exists
      const hasSkuldScheme = mainActivity['intent-filter'].some((filter: any) =>
        filter.data?.some((d: any) => d.$?.['android:scheme'] === 'skuld')
      );

      if (!hasSkuldScheme) {
        mainActivity['intent-filter'].push({
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          category: [
            { $: { 'android:name': 'android.intent.category.DEFAULT' } },
            { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
          ],
          data: [{ $: { 'android:scheme': 'skuld' } }],
        });
      }
    }

    // Register QuickTalkWidgetProvider receiver
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    const hasWidgetReceiver = mainApplication.receiver.some(
      (r: any) => r.$?.['android:name'] === '.widget.QuickTalkWidgetProvider'
    );

    if (!hasWidgetReceiver) {
      const receiverEntry: any = {
        $: {
          'android:name': '.widget.QuickTalkWidgetProvider',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/skuld_quick_talk_widget_info',
            },
          },
        ],
      };
      mainApplication.receiver.push(receiverEntry);
    }

    return modConfig;
  });

  // 2. Dangerous mod to copy XML and drawable resources into android/app/src/main/res
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const resDir = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');

      const xmlDir = path.join(resDir, 'xml');
      const layoutDir = path.join(resDir, 'layout');
      const drawableDir = path.join(resDir, 'drawable');

      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(layoutDir, { recursive: true });
      fs.mkdirSync(drawableDir, { recursive: true });

      // Copy skuld_quick_talk_widget_info.xml
      const widgetInfoSource = path.join(projectRoot, 'assets', 'android-widget', 'skuld_quick_talk_widget_info.xml');
      if (fs.existsSync(widgetInfoSource)) {
        fs.copyFileSync(widgetInfoSource, path.join(xmlDir, 'skuld_quick_talk_widget_info.xml'));
      }

      // Copy skuld_quick_talk_widget_layout.xml
      const widgetLayoutSource = path.join(projectRoot, 'assets', 'android-widget', 'skuld_quick_talk_widget_layout.xml');
      if (fs.existsSync(widgetLayoutSource)) {
        fs.copyFileSync(widgetLayoutSource, path.join(layoutDir, 'skuld_quick_talk_widget_layout.xml'));
      }

      // Ensure supporting drawables exist for layout references
      const drawables: Record<string, string> = {
        'skuld_widget_background.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#F20A0A12" />
    <corners android:radius="16dp" />
    <stroke android:width="1dp" android:color="#3300E5FF" />
</shape>`,
        'skuld_widget_orb_cyan.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="#2600E5FF" />
    <stroke android:width="2dp" android:color="#00E5FF" />
</shape>`,
        'skuld_widget_action_btn.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="#1AFFFFFF" />
    <stroke android:width="1dp" android:color="#33DCE4EC" />
</shape>`,
        'skuld_widget_preview.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#0A0A12" />
    <corners android:radius="16dp" />
</shape>`,
      };

      for (const [name, content] of Object.entries(drawables)) {
        const dest = path.join(drawableDir, name);
        if (!fs.existsSync(dest)) {
          fs.writeFileSync(dest, content, 'utf8');
        }
      }

      return modConfig;
    },
  ]);

  return config;
};

export default withAndroidQuickTalkWidget;

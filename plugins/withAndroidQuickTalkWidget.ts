import { ConfigPlugin, withAndroidManifest, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Expo Config Plugin for Skuld Android Home Screen Quick-Talk Widget.
 * Injects:
 * 1. Deep linking scheme <data android:scheme="skuld" /> into the main activity.
 * 2. AppWidgetProvider receiver for the Skuld Home Screen Widget.
 * 3. XML layouts and drawable resources into android/app/src/main/res/ during prebuild.
 * 4. Generates QuickTalkWidgetProvider.kt in the app's package directory.
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

  // 2. Dangerous mod to copy XML, drawable resources, and Kotlin widget provider
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const resDir = path.join(androidRoot, 'app', 'src', 'main', 'res');

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

      // 3. Find app package directory and create QuickTalkWidgetProvider.kt
      const javaDir = path.join(androidRoot, 'app', 'src', 'main', 'java');
      const findPackageDir = (dir: string): string | null => {
        if (!fs.existsSync(dir)) return null;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const sub = path.join(dir, entry.name);
            if (fs.existsSync(path.join(sub, 'MainActivity.kt')) || fs.existsSync(path.join(sub, 'MainActivity.java'))) {
              return sub;
            }
            const found = findPackageDir(sub);
            if (found) return found;
          }
        }
        return null;
      };

      const packageDir = findPackageDir(javaDir);
      if (packageDir) {
        // Derive package name from relative path from javaDir
        const relPackage = path.relative(javaDir, packageDir).replace(/\\/g, '/').replace(/\//g, '.');
        const widgetDir = path.join(packageDir, 'widget');
        fs.mkdirSync(widgetDir, { recursive: true });

        const widgetKotlin = `package ${relPackage}.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import ${relPackage}.R

class QuickTalkWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.skuld_quick_talk_widget_layout)

            // Deep link for Talk button -> skuld://quick-talk?agent=butler&source=android_widget
            val talkIntent = Intent(Intent.ACTION_VIEW, Uri.parse("skuld://quick-talk?agent=butler&source=android_widget")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val talkPendingIntent = PendingIntent.getActivity(
                context,
                101,
                talkIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_widget_talk, talkPendingIntent)

            // Deep link for Scan button -> skuld://scan_receipt?source=android_widget
            val scanIntent = Intent(Intent.ACTION_VIEW, Uri.parse("skuld://scan_receipt?source=android_widget")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val scanPendingIntent = PendingIntent.getActivity(
                context,
                102,
                scanIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_widget_scan, scanPendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
`;
        fs.writeFileSync(path.join(widgetDir, 'QuickTalkWidgetProvider.kt'), widgetKotlin, 'utf8');
      }

      return modConfig;
    },
  ]);

  return config;
};

export default withAndroidQuickTalkWidget;

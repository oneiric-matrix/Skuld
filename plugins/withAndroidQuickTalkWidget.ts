import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

/**
 * Expo Config Plugin for Skuld Android Home Screen Quick-Talk Widget.
 * Injects:
 * 1. Deep linking scheme <data android:scheme="skuld" /> into the main activity.
 * 2. AppWidgetProvider receiver for the Skuld Home Screen Widget.
 */
export const withAndroidQuickTalkWidget: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (!mainApplication) return config;

    // 1. Ensure main activity handles skuld:// deep links
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

    // 2. Register QuickTalkWidgetProvider receiver
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

    return config;
  });
};

export default withAndroidQuickTalkWidget;

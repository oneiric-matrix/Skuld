import { ConfigPlugin, withDangerousMod, withGradleProperties } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Expo Config Plugin to manage ProGuard / R8 and Gradle configuration:
 * 1. Disables aggressive R8 release minification (`android.enableMinifyInReleaseBuilds=false`)
 *    which causes native crashes in standalone APKs due to missing reflection targets.
 * 2. Injects comprehensive ProGuard / R8 keep rules to protect Expo modules and providers.
 */
export const withCustomProguardRules: ConfigPlugin = (config) => {
  // 1. Disable R8 minification in gradle.properties
  config = withGradleProperties(config, (modConfig) => {
    // Set or update android.enableMinifyInReleaseBuilds to false
    const existingIndex = modConfig.modResults.findIndex(
      (item) => item.type === 'property' && item.key === 'android.enableMinifyInReleaseBuilds'
    );

    if (existingIndex !== -1) {
      modConfig.modResults[existingIndex] = {
        type: 'property',
        key: 'android.enableMinifyInReleaseBuilds',
        value: 'false',
      };
    } else {
      modConfig.modResults.push({
        type: 'property',
        key: 'android.enableMinifyInReleaseBuilds',
        value: 'false',
      });
    }

    // Also disable shrinkResources
    const shrinkIndex = modConfig.modResults.findIndex(
      (item) => item.type === 'property' && item.key === 'android.enableShrinkResourcesInReleaseBuilds'
    );
    if (shrinkIndex !== -1) {
      modConfig.modResults[shrinkIndex] = {
        type: 'property',
        key: 'android.enableShrinkResourcesInReleaseBuilds',
        value: 'false',
      };
    } else {
      modConfig.modResults.push({
        type: 'property',
        key: 'android.enableShrinkResourcesInReleaseBuilds',
        value: 'false',
      });
    }

    return modConfig;
  });

  // 2. Dangerous mod to inject ProGuard keep rules for safety
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const proguardPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );

      const rules = `
# ProGuard / R8 rules for Skuld Native Modules & Expo Modules Core
-keep class expo.modules.** { *; }
-keep interface expo.modules.** { *; }
-keep class * extends expo.modules.kotlin.modules.Module { *; }
-keep class * extends expo.modules.core.ExportedModule { *; }
-keep class * extends android.appwidget.AppWidgetProvider { *; }

-dontwarn expo.modules.core.interfaces.services.KeepAwakeManager
-dontwarn expo.modules.kotlin.types.AnyTypeProvider
-dontwarn expo.modules.kotlin.types.LazyKType
-dontwarn expo.modules.av.**
-dontwarn expo.modules.**
-dontwarn com.facebook.react.**
`;

      if (fs.existsSync(proguardPath)) {
        fs.appendFileSync(proguardPath, rules, 'utf8');
      } else {
        fs.writeFileSync(proguardPath, rules, 'utf8');
      }

      return modConfig;
    },
  ]);

  return config;
};

export default withCustomProguardRules;

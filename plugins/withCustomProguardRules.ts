import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Expo Config Plugin to inject ProGuard / R8 rules for Skuld native dependencies
 * Resolves missing classes and ensures all Expo modules, SQLite, SecureStore, and LocalAuth
 * classes are kept without aggressive obfuscation breaking reflection.
 */
export const withCustomProguardRules: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
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
};

export default withCustomProguardRules;

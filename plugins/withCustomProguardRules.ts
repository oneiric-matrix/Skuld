import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Expo Config Plugin to inject ProGuard / R8 rules for Skuld native dependencies
 * Resolves missing classes in expo-av and expo core during release minification (R8).
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
# ProGuard / R8 rules for Skuld Native Modules
-keep class expo.modules.core.interfaces.services.** { *; }
-keep class expo.modules.kotlin.types.** { *; }
-keep class expo.modules.av.** { *; }
-dontwarn expo.modules.core.interfaces.services.KeepAwakeManager
-dontwarn expo.modules.kotlin.types.AnyTypeProvider
-dontwarn expo.modules.kotlin.types.LazyKType
-dontwarn expo.modules.av.**
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

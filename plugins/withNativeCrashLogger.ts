import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Expo Config Plugin to inject a global native UncaughtExceptionHandler in MainApplication.kt
 * Writes the crash report to both internal storage and public app-specific external storage
 * (Android/data/com.anonymous.skuldapp/files/skuld_crash_log.txt and Documents/skuld_crash_log.txt)
 * without requiring Scoped Storage permissions.
 */
export const withNativeCrashLogger: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const javaDir = path.join(androidRoot, 'app', 'src', 'main', 'java');

      // Recursively locate MainApplication.kt
      const findMainApp = (dir: string): string | null => {
        if (!fs.existsSync(dir)) return null;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = findMainApp(fullPath);
            if (found) return found;
          } else if (entry.name === 'MainApplication.kt') {
            return fullPath;
          }
        }
        return null;
      };

      const mainAppPath = findMainApp(javaDir);
      if (!mainAppPath) return modConfig;

      let content = fs.readFileSync(mainAppPath, 'utf8');

      // Check if already injected
      if (content.includes('initNativeCrashLogger')) {
        return modConfig;
      }

      // Add helper imports
      const importsToAdd = `
import android.os.Environment
import android.util.Log
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
`;

      content = content.replace(/(package [^\n]+)/, `$1\n${importsToAdd}`);

      // Crash handler helper implementation
      const crashHandlerCode = `
  private fun initNativeCrashLogger() {
    val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      try {
        val sw = StringWriter()
        val pw = PrintWriter(sw)
        throwable.printStackTrace(pw)
        val stackTrace = sw.toString()
        val timeStamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())

        val logContent = """
======================================================
SKULD NATIVE CRASH REPORT
Timestamp: $timeStamp
Thread: \${thread.name} (\${thread.id})
Exception: \${throwable.javaClass.name}
Message: \${throwable.message}
======================================================
$stackTrace
======================================================
""".trimIndent()

        Log.e("SkuldCrashLogger", logContent)

        // 1. Write to internal files directory
        try {
          val internalFile = File(filesDir, "skuld_crash_log.txt")
          internalFile.writeText(logContent)
        } catch (e: Exception) {
          Log.e("SkuldCrashLogger", "Failed to write internal crash log", e)
        }

        // 2. Write to external files directory (Android/data/com.anonymous.skuldapp/files/skuld_crash_log.txt)
        // This never requires any permissions on Android 10, 11, 12, 13, 14, 15!
        try {
          val extFilesDir = getExternalFilesDir(null)
          if (extFilesDir != null) {
            val extFile = File(extFilesDir, "skuld_crash_log.txt")
            extFile.writeText(logContent)
          }
        } catch (e: Exception) {
          Log.e("SkuldCrashLogger", "Failed to write external files crash log", e)
        }

        // 3. Write to public Documents/Download via MediaStore or fallback if available
        try {
          val documentsDir = getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
          if (documentsDir != null) {
            val docFile = File(documentsDir, "skuld_crash_log.txt")
            docFile.writeText(logContent)
          }
        } catch (e: Exception) {
          Log.e("SkuldCrashLogger", "Failed to write documents crash log", e)
        }

        // 4. Also try public Downloads via legacy path
        try {
          val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
          if (downloadsDir != null && downloadsDir.exists()) {
            val publicFile = File(downloadsDir, "skuld_crash_log.txt")
            publicFile.writeText(logContent)
          }
        } catch (e: Exception) {
          Log.e("SkuldCrashLogger", "Failed to write public crash log", e)
        }
      } catch (fatal: Throwable) {
        Log.e("SkuldCrashLogger", "Fatal error in crash handler", fatal)
      } finally {
        defaultHandler?.uncaughtException(thread, throwable)
      }
    }
  }
`;

      // Inject call inside onCreate before loadReactNative
      content = content.replace(
        /super\.onCreate\(\)/,
        `super.onCreate()\n    initNativeCrashLogger()`
      );

      // Append method before the last closing brace
      const lastBraceIndex = content.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        content = content.substring(0, lastBraceIndex) + crashHandlerCode + '\n}\n';
      }

      fs.writeFileSync(mainAppPath, content, 'utf8');
      return modConfig;
    },
  ]);
};

export default withNativeCrashLogger;

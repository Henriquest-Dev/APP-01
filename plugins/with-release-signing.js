/**
 * Signs Android release builds (the .aab for Google Play) with the upload key.
 *
 * The keystore and passwords are never committed. They come from environment
 * variables (or ~/.gradle/gradle.properties):
 *   CALLOUT_UPLOAD_STORE_FILE      absolute path to the .jks file
 *   CALLOUT_UPLOAD_STORE_PASSWORD
 *   CALLOUT_UPLOAD_KEY_ALIAS
 *   CALLOUT_UPLOAD_KEY_PASSWORD
 * Without them, release builds fall back to the debug key (fine for testing,
 * rejected by Google Play).
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// callout-release-signing';

const signingConfig = `
        release { ${MARKER}
            def storeFilePath = findProperty('CALLOUT_UPLOAD_STORE_FILE') ?: System.getenv('CALLOUT_UPLOAD_STORE_FILE')
            if (storeFilePath) {
                storeFile file(storeFilePath)
                storePassword findProperty('CALLOUT_UPLOAD_STORE_PASSWORD') ?: System.getenv('CALLOUT_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('CALLOUT_UPLOAD_KEY_ALIAS') ?: System.getenv('CALLOUT_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('CALLOUT_UPLOAD_KEY_PASSWORD') ?: System.getenv('CALLOUT_UPLOAD_KEY_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARKER)) return cfg;

    gradle = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${signingConfig}`);
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s*=?\s*signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release.storeFile ? signingConfigs.release : signingConfigs.debug',
    );
    if (!gradle.includes(MARKER) || !gradle.includes('signingConfigs.release.storeFile')) {
      throw new Error('with-release-signing: android/app/build.gradle layout changed, update the plugin');
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });
};

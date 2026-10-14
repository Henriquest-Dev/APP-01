const fs = require('fs');

/**
 * app.json stays the source of truth. This only adds the Firebase client file
 * (google-services.json, needed for push notifications) when it exists, so the
 * app still builds without it; push simply stays off until the file is added.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(fs.existsSync('./google-services.json') ? { googleServicesFile: './google-services.json' } : {}),
  },
});

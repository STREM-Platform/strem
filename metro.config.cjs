/* global __dirname */
const { createHash } = require("node:crypto");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Expo inlines these values into transformed modules. Test and review servers
// share a checkout, so their cache keys must differ when their API URLs differ.
const publicEnvironment = Object.entries(process.env)
  .filter(([key]) => key.startsWith("EXPO_PUBLIC_"))
  .sort(([a], [b]) => a.localeCompare(b));
const environmentHash = createHash("sha256")
  .update(JSON.stringify(publicEnvironment))
  .digest("hex");
config.cacheVersion = `${config.cacheVersion}:strem-public-env:${environmentHash}`;

module.exports = config;

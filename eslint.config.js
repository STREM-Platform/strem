// Flat ESLint config using the canonical Expo config.
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // design-spec/ is the web reference prototype (globals via window), not RN
    // app source — exclude it from linting.
    ignores: ["dist/*", ".expo/*", "node_modules/*", "design-spec/*"],
  },
  {
    // Unit tests lazily `require()` the module under test *after* registering
    // jest mocks — the standard pattern when not relying on babel mock-hoisting.
    files: ["**/__tests__/**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

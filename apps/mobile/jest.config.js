// Jest config for plain-logic unit tests (no RN renderer). We transform TS/ESM
// with babel-jest using an inline preset so this never depends on a project-wide
// babel.config.js (Metro supplies its own). Native modules are mocked per-test.
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": [
      "babel-jest",
      {
        babelrc: false,
        configFile: false,
        presets: [["@babel/preset-typescript", { allowDeclareFields: true }]],
        plugins: ["@babel/plugin-transform-modules-commonjs"],
      },
    ],
  },
};

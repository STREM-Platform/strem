import { defineConfig } from "@playwright/test";

const python = process.env.STREM_TEST_BACKEND_PYTHON;
if (!python)
  throw new Error(
    "Set STREM_TEST_BACKEND_PYTHON to a Python environment with auth/user/gateway test dependencies.",
  );

export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  expect: { timeout: 12000 },
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://localhost:9510",
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "off", // Do not retain tokens or network payloads in traces.
  },
  webServer: {
    command: `"${python}" e2e/serve.py`,
    url: "http://localhost:9510",
    timeout: 120000,
    reuseExistingServer: false,
  },
  projects: [
    { name: "compact", use: { viewport: { width: 390, height: 844 } } },
    { name: "wide", use: { viewport: { width: 1440, height: 1000 } } },
  ],
});

import { defineConfig } from "@playwright/test";
import path from "node:path";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3107);
export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      HERMES_STATE_DIR: path.resolve("./tests/fixtures/gateway-empty-state"),
      NEXT_PUBLIC_GATEWAY_URL: "",
    },
  },
});

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../../tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:8462",
    launchOptions: { executablePath: "/usr/bin/chromium" },
    trace: "retain-on-failure",
  },
  workers: 1,
  reporter: [["line"]],
});

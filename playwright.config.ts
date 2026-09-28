import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const chromeInstalled =
  process.platform === "win32" &&
  [
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    process.env.LOCALAPPDATA,
  ].some(
    (directory) =>
      directory &&
      existsSync(
        join(directory, "Google", "Chrome", "Application", "chrome.exe"),
      ),
  );

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:18080",
    browserName: "chromium",
    channel:
      process.env.BINGA_BROWSER_CHANNEL ||
      (chromeInstalled ? "chrome" : undefined),
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/test-server.mjs",
    url: "http://127.0.0.1:18080/api/health",
    reuseExistingServer: false,
  },
});

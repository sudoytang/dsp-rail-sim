import { defineConfig } from "@playwright/test";

const production = process.env.PLAYWRIGHT_PRODUCTION === "1";
const baseURL = production ? "http://127.0.0.1:4173" : "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    headless: true,
    channel: "chromium",
    launchOptions: {
      args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader"],
    },
  },
  webServer: {
    command: production ? "npm run preview -- --host 127.0.0.1" : "npm run dev -- --host 127.0.0.1",
    url: baseURL,
    reuseExistingServer: true,
  },
});

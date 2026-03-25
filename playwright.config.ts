import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 120_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: process.env.PCROBOTS_WEB_URL ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: [
    {
      command: "node dist/apps/api/src/server.js",
      cwd: "H:/Code/pcrobots/apps/api",
      env: {
        ...process.env,
        PORT: "3101",
        DATABASE_URL: process.env.DATABASE_URL ?? "postgres://pcrobots:pcrobots@127.0.0.1:5432/pcrobots",
        REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
        PCROBOTS_EXECUTION_MODE: "local"
      },
      url: "http://127.0.0.1:3101/health",
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "node server.mjs",
      cwd: "H:/Code/pcrobots/apps/web",
      env: {
        ...process.env,
        PORT: "4173",
        PCROBOTS_API_PROXY_URL: "http://127.0.0.1:3101"
      },
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
      timeout: 120_000
    }
  ],
  reporter: [["list"]]
});


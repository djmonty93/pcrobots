import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const useMockApi = process.env.PCROBOTS_E2E_USE_MOCK_API === "1";
const repoRoot = process.cwd();

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
      command: useMockApi ? "node tests/e2e/mock-api.mjs" : "node dist/apps/api/src/server.js",
      cwd: useMockApi ? repoRoot : resolve(repoRoot, "apps/api"),
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
      cwd: resolve(repoRoot, "apps/web"),
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


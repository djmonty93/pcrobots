import { spawn } from "node:child_process";

process.env.PCROBOTS_E2E_USE_MOCK_API = "1";

const command = process.platform === "win32" ? "cmd.exe" : "npx";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npx playwright test tests/e2e/app.spec.ts"]
    : ["playwright", "test", "tests/e2e/app.spec.ts"];

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  shell: false
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

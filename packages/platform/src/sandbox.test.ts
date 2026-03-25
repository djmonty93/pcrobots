import test from "node:test";
import assert from "node:assert/strict";

import { buildSandboxDockerArgs, parseSandboxResult } from "./sandbox.js";

test("buildSandboxDockerArgs applies strict container isolation flags", () => {
  const args = buildSandboxDockerArgs({
    image: "pcrobots-worker:latest",
    cpuLimit: "0.50",
    memoryLimit: "256m",
    pidsLimit: "64",
    timeoutMs: 5000
  });

  assert.deepEqual(args.slice(0, 3), ["run", "--rm", "-i"]);
  assert.ok(args.includes("--network"));
  assert.ok(args.includes("none"));
  assert.ok(args.includes("--read-only"));
  assert.ok(args.includes("--cap-drop"));
  assert.ok(args.includes("ALL"));
  assert.ok(args.includes("--security-opt"));
  assert.ok(args.includes("no-new-privileges"));
  assert.ok(args.includes("--tmpfs"));
  assert.ok(args.includes("/tmp:rw,noexec,nosuid,size=64m"));
  assert.ok(args.includes("--user"));
  assert.ok(args.includes("node"));
  assert.ok(args.includes("--env"));
  assert.ok(args.includes("PCROBOTS_PYTHON_BIN=python"));
  assert.equal(args.at(-3), "pcrobots-worker:latest");
  assert.equal(args.at(-2), "node");
  assert.equal(args.at(-1), "/app/packages/platform/dist/platform/src/sandbox-runner.js");
});

test("buildSandboxDockerArgs does not grant network, writable rootfs, or extra capabilities", () => {
  const args = buildSandboxDockerArgs({
    image: "pcrobots-worker:latest",
    cpuLimit: "1.0",
    memoryLimit: "512m",
    pidsLimit: "32",
    timeoutMs: 5000
  });

  assert.equal(args.includes("--privileged"), false);
  assert.equal(args.includes("--cap-add"), false);
  assert.equal(args.includes("--volume"), false);
  assert.equal(args.includes("--mount"), false);
  assert.ok(args.includes("--network"));
  assert.ok(args.includes("none"));
  assert.ok(args.includes("--read-only"));
});

test("parseSandboxResult throws if stdout is not valid JSON", () => {
  assert.throws(
    () => parseSandboxResult({ error: null, status: 0, stdout: "not-json\n", stderr: "" } as any),
    (err: Error) => {
      assert.ok(err.message.includes("not-json"));
      return true;
    }
  );
});

test("parseSandboxResult throws on non-zero exit with stderr message", () => {
  assert.throws(
    () => parseSandboxResult({ error: null, status: 1, stdout: "", stderr: "OOM killed" } as any),
    /OOM killed/
  );
});

test("parseSandboxResult throws when stdout is empty", () => {
  assert.throws(
    () => parseSandboxResult({ error: null, status: 0, stdout: "   ", stderr: "" } as any),
    /no output/i
  );
});

test("parseSandboxResult throws the spawn error when result.error is set", () => {
  const spawnError = new Error("spawn docker ENOENT");
  assert.throws(
    () => parseSandboxResult({ error: spawnError, status: null, stdout: "", stderr: "" } as any),
    /spawn docker ENOENT/
  );
});

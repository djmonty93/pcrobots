import test from "node:test";
import assert from "node:assert/strict";

import { buildSandboxDockerArgs } from "./sandbox.js";

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
  assert.equal(args.at(-3), "pcrobots-worker:latest");
  assert.equal(args.at(-2), "node");
  assert.equal(args.at(-1), "/app/packages/platform/dist/platform/src/sandbox-runner.js");
});

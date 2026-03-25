import { simulateMatch } from "./execution.js";
import { type MatchRecord } from "./db.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8").trim();
}

try {
  const raw = await readStdin();
  if (!raw) {
    throw new Error("Sandbox runner expected a JSON match payload on stdin");
  }

  const match = JSON.parse(raw) as MatchRecord;
  const simulated = simulateMatch(match);
  process.stdout.write(`${JSON.stringify(simulated)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

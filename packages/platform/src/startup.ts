export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  label?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 10;
  const maxDelayMs = options.maxDelayMs ?? 5000;
  const factor = options.factor ?? 1.5;
  let delayMs = options.delayMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }

      console.warn("startup dependency not ready", {
        label: options.label ?? "startup",
        attempt,
        attempts,
        delayMs,
        error: error instanceof Error ? error.message : String(error)
      });

      await sleep(delayMs);
      delayMs = Math.min(Math.round(delayMs * factor), maxDelayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  isRetryable?: (error: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
};

const DEFAULT_RETRYABLE = (error: unknown) => {
  if (!error || typeof error !== "object") return true;
  const err = error as { code?: string; status?: number; message?: string };
  if (err.status && err.status >= 400 && err.status < 500 && err.status !== 429) {
    return false;
  }
  const msg = (err.message || "").toLowerCase();
  if (msg.includes("not found") || msg.includes("forbidden") || msg.includes("invalid")) {
    return false;
  }
  return true;
};

export async function withRetries<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const sleep =
    options.sleep ||
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const isRetryable = options.isRetryable || DEFAULT_RETRYABLE;
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = attempt < options.maxAttempts && isRetryable(error);
      if (!canRetry) break;
      const delay = options.baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = "operation",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

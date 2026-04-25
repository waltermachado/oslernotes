export function computeBackoffMs(retryCount: number) {
  const base = 2000;
  const max = 60_000;
  const exp = Math.min(max, base * 2 ** Math.max(0, retryCount));
  const jitter = Math.floor(Math.random() * 250);
  return exp + jitter;
}


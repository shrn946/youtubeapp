interface Bucket {
  count: number;
  resetAt: number;
}

const globalRateLimits = globalThis as typeof globalThis & {
  youtubeSeoRateLimits?: Map<string, Bucket>;
};
const buckets = globalRateLimits.youtubeSeoRateLimits ?? new Map<string, Bucket>();
globalRateLimits.youtubeSeoRateLimits = buckets;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 60;
const MAX_BUCKETS = 5000;

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const current = buckets.get(identifier);

  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
      if (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value ?? "");
    }
    buckets.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  current.count += 1;
  return {
    allowed: current.count <= MAX_REQUESTS,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

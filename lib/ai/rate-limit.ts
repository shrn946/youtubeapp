import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

const globalLimits = globalThis as typeof globalThis & {
  youtubeSeoAiRateLimits?: Map<string, Bucket>;
};
const buckets = globalLimits.youtubeSeoAiRateLimits ?? new Map<string, Bucket>();
globalLimits.youtubeSeoAiRateLimits = buckets;

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 1200;

export function checkAiRateLimit(identifier: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const current = buckets.get(identifier);
  if (!current || current.resetAt <= now) {
    if (buckets.size >= 5000) buckets.delete(buckets.keys().next().value ?? "");
    buckets.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= MAX_REQUESTS,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

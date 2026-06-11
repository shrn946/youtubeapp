import type { ExtractResponse } from "@/types/video";

interface CacheEntry {
  expiresAt: number;
  value: Omit<ExtractResponse, "cached">;
}

const globalCache = globalThis as typeof globalThis & {
  youtubeSeoCache?: Map<string, CacheEntry>;
};
const cache = globalCache.youtubeSeoCache ?? new Map<string, CacheEntry>();
globalCache.youtubeSeoCache = cache;

const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 25;

export function getCached(url: string): ExtractResponse | null {
  const entry = cache.get(url);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(url);
    return null;
  }
  return { ...entry.value, cached: true };
}

export function setCached(url: string, value: Omit<ExtractResponse, "cached">): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(url, { value, expiresAt: Date.now() + TTL_MS });
}

import "server-only";
import type { AiSeoResult } from "@/types/video";

interface CacheEntry {
  expiresAt: number;
  result: AiSeoResult;
}

const globalCache = globalThis as typeof globalThis & {
  youtubeSeoAiCache?: Map<string, CacheEntry>;
};
const cache = globalCache.youtubeSeoAiCache ?? new Map<string, CacheEntry>();
globalCache.youtubeSeoAiCache = cache;

export function getAiCache(key: string): AiSeoResult | null {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function setAiCache(key: string, result: AiSeoResult): void {
  if (cache.size >= 2000) cache.delete(cache.keys().next().value ?? "");
  cache.set(key, { result, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
}

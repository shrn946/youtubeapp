import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { generateUpcomingIdeas } from "@/lib/ai/generate-upcoming-ideas";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import {
  upcomingIdeasInputSchema,
  type UpcomingIdeasResult,
} from "@/lib/ai/upcoming-ideas";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CacheEntry {
  expiresAt: number;
  result: UpcomingIdeasResult;
}

const globalCache = globalThis as typeof globalThis & {
  youtubeUpcomingIdeasCache?: Map<string, CacheEntry>;
};
const cache = globalCache.youtubeUpcomingIdeasCache ?? new Map<string, CacheEntry>();
globalCache.youtubeUpcomingIdeasCache = cache;
const requestSchema = upcomingIdeasInputSchema.extend({
  refresh: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "local";
    const rateLimit = checkAiRateLimit(clientId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many AI requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
      );
    }
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 500_000) {
      return NextResponse.json({ error: "Video catalog is too large." }, { status: 413 });
    }
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid video catalog." }, { status: 400 });
    }

    const { refresh, ...input } = parsed.data;
    const provider = process.env.AI_PROVIDER || "gemini";
    const cacheKey = createHash("sha256")
      .update(`upcoming-ideas-v2:${provider}:${JSON.stringify(input)}`)
      .digest("hex");
    const cached = cache.get(cacheKey);
    if (!refresh && cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ result: cached.result, cached: true });
    }

    const result = await generateUpcomingIdeas(input);
    if (cache.size >= 100) cache.delete(cache.keys().next().value ?? "");
    cache.set(cacheKey, { result, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    return NextResponse.json({ result, cached: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upcoming ideas generation failed." },
      { status: 502 },
    );
  }
}

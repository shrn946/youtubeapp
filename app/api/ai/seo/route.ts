import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAiCache, setAiCache } from "@/lib/ai/cache";
import { generateSeoWithProvider } from "@/lib/ai/provider";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { aiSeoInputSchema } from "@/lib/ai/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    if (contentLength > 25_000) {
      return NextResponse.json({ error: "AI request is too large." }, { status: 413 });
    }
    const parsed = aiSeoInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid video metadata." }, { status: 400 });
    }

    const providerName = process.env.AI_PROVIDER || "gemini";
    const cacheKey = createHash("sha256")
      .update(`full-seo-v5-thumbnail:${providerName}:${JSON.stringify(parsed.data)}`)
      .digest("hex");
    const cached = getAiCache(cacheKey);
    if (cached) return NextResponse.json({ result: cached, cached: true });

    const result = await generateSeoWithProvider(parsed.data);
    setAiCache(cacheKey, result);
    return NextResponse.json({ result, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

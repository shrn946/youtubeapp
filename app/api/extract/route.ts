import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractRequestSchema, normalizeYouTubeUrl } from "@/lib/validation";
import type { ExtractResponse, Video } from "@/types/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const configuredTimeout = Number(process.env.EXTRACT_TIMEOUT_MS);
const TIMEOUT_MS = Number.isFinite(configuredTimeout)
  ? Math.min(30 * 60 * 1000, Math.max(30_000, configuredTimeout))
  : 10 * 60 * 1000;
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

function runExtractor(url: string, offset: number, limit: number): Promise<Omit<ExtractResponse, "cached">> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), "scripts", "youtube-extractor.py");
    const python = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV,
      PYTHONIOENCODING: "utf-8",
    };
    const child = spawn(python, [script, url, String(offset), String(limit)], {
      cwd: process.cwd(),
      windowsHide: true,
      shell: false,
      env: childEnv,
    });
    child.stdin.end();

    let stdout = "";
    let stderr = "";
    let bytes = 0;
    let settled = false;
    const finish = (error?: Error, value?: Omit<ExtractResponse, "cached">) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(value!);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("Extraction timed out. Try again or use the channel's Videos URL."));
    }, TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        finish(new Error("The channel returned too much data."));
        return;
      }
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-8000);
    });
    child.on("error", () => finish(new Error("Python or yt-dlp is not available on the server.")));
    child.on("close", (code: number | null) => {
      if (settled) return;
      if (code !== 0) {
        const structuredError = stderr
          .split(/\r?\n/)
          .reverse()
          .find((line) => line.startsWith("YSM_ERROR:"));
        if (structuredError) {
          try {
            const parsed = JSON.parse(structuredError.slice("YSM_ERROR:".length)) as { error?: string };
            finish(new Error(parsed.error || "Metadata extraction failed."));
            return;
          } catch {
            // Fall through to a stable public error.
          }
        }
        finish(new Error("Metadata extraction failed. Update yt-dlp and try again."));
        return;
      }
      try {
        const result = JSON.parse(stdout) as Omit<ExtractResponse, "cached">;
        if (!Array.isArray(result.videos)) throw new Error("Invalid extractor response.");
        result.videos = result.videos.filter((video: Video) => video.id && video.url);
        result.offset = offset;
        result.nextOffset = Number.isInteger(result.nextOffset)
          ? Math.min(10020, Math.max(offset, result.nextOffset))
          : offset + result.videos.length;
        result.total = Math.max(result.total || 0, result.nextOffset);
        result.hasMore = Boolean(result.hasMore);
        finish(undefined, result);
      } catch {
        finish(new Error("The extractor returned an invalid response."));
      }
    });
  });
}

export async function POST(request: Request) {
  try {
    const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "local";
    const rateLimit = checkRateLimit(clientId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many extraction requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
      );
    }
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 2048) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
    const parsed = extractRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid channel URL or @handle." }, { status: 400 });
    }
    const { offset, limit, refresh } = parsed.data;
    const url = normalizeYouTubeUrl(parsed.data.url);
    const cacheKey = `${url}#${offset}:${limit}`;
    if (!refresh) {
      const cached = getCached(cacheKey);
      if (cached) return NextResponse.json(cached);
    }

    const result = await runExtractor(url, offset, limit);
    setCached(cacheKey, result);
    return NextResponse.json({ ...result, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected extraction error.";
    const status = /valid|allowed|channel URL/i.test(message) ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

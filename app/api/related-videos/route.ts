import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  query: z.string().trim().min(3).max(300),
  currentChannel: z.string().trim().max(500),
  excludedIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{11}$/)).max(1000),
});

interface SearchVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  uploadDate: string | null;
  views: number;
  channelName: string;
}

function runSearch(query: string): Promise<SearchVideo[]> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), "scripts", "youtube-related-search.py");
    const python = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
    const child = spawn(python, [script, query], {
      cwd: process.cwd(),
      windowsHide: true,
      shell: false,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    child.stdin.end();

    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (error?: Error, videos?: SearchVideo[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(videos!);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("Related video search timed out."));
    }, 90_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout) > 8 * 1024 * 1024) {
        child.kill("SIGKILL");
        finish(new Error("Related video search returned too much data."));
      }
    });
    child.stderr.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-8000);
    });
    child.on("error", () => finish(new Error("Python or yt-dlp is not available on the server.")));
    child.on("close", (code: number | null) => {
      if (settled) return;
      if (code !== 0) {
        const structured = stderr.split(/\r?\n/).reverse().find((line) => line.startsWith("YSM_ERROR:"));
        if (structured) {
          try {
            const parsed = JSON.parse(structured.slice("YSM_ERROR:".length)) as { error?: string };
            finish(new Error(parsed.error || "Related video search failed."));
            return;
          } catch {
            // Fall through to stable error.
          }
        }
        finish(new Error("Related video search failed. Update yt-dlp and try again."));
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as { videos?: SearchVideo[] };
        if (!Array.isArray(parsed.videos)) throw new Error();
        finish(undefined, parsed.videos);
      } catch {
        finish(new Error("Related video search returned an invalid response."));
      }
    });
  });
}

function performanceSummary(video: SearchVideo, query: string): string {
  const queryWords = new Set(query.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const titleWords = video.title.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const overlap = titleWords.filter((word) => word.length > 3 && queryWords.has(word)).length;
  const demand = video.views >= 1_000_000
    ? "exceptional view traction"
    : video.views >= 100_000
      ? "strong view traction"
      : video.views >= 10_000
        ? "solid audience traction"
        : "clear topic relevance";
  const recency = video.uploadDate && video.uploadDate >= `${new Date().getUTCFullYear() - 2}-01-01`
    ? " It is also relatively recent, which can indicate continuing audience interest."
    : "";
  return `This video combines ${demand} with ${overlap >= 2 ? "close keyword alignment" : "a closely related viewer outcome"}. Its title makes the topic and expected result easy to understand.${recency}`;
}

export async function POST(request: Request) {
  try {
    const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "local";
    const rateLimit = checkRateLimit(clientId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many YouTube search requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
      );
    }
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid related-video search request." }, { status: 400 });
    }
    const found = await runSearch(parsed.data.query);
    const excluded = new Set(parsed.data.excludedIds);
    const currentChannel = parsed.data.currentChannel.toLowerCase();
    const videos = found
      .filter((video) => video.id && video.title && video.url && !excluded.has(video.id))
      .filter((video) => !currentChannel || video.channelName.toLowerCase() !== currentChannel)
      .sort((a, b) => b.views - a.views)
      .slice(0, 12)
      .map((video) => ({
        ...video,
        summary: performanceSummary(video, parsed.data.query),
      }));
    return NextResponse.json({ videos, query: parsed.data.query });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Related video search failed." },
      { status: 502 },
    );
  }
}

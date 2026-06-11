import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Video } from "@/types/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
});

function runExtractor(videoId: string): Promise<Video> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), "scripts", "youtube-video-extractor.py");
    const python = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
    const child = spawn(python, [script, videoId], {
      cwd: process.cwd(),
      windowsHide: true,
      shell: false,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    child.stdin.end();

    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (error?: Error, value?: Video) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(value!);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("Video refresh timed out."));
    }, 60_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout = (stdout + chunk).slice(-2 * 1024 * 1024);
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
            finish(new Error(parsed.error || "Video refresh failed."));
            return;
          } catch {
            // Fall through to a stable public error.
          }
        }
        finish(new Error("Video refresh failed. Update yt-dlp and try again."));
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as { video?: Video };
        if (!parsed.video?.id || parsed.video.id !== videoId) throw new Error();
        finish(undefined, parsed.video);
      } catch {
        finish(new Error("The video extractor returned an invalid response."));
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
        { error: "Too many refresh requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
      );
    }
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid YouTube video ID." }, { status: 400 });
    }
    const video = await runExtractor(parsed.data.videoId);
    return NextResponse.json({ video });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected video refresh error." },
      { status: 502 },
    );
  }
}

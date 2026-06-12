import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { generateSubtitles } from "@/lib/ai/generate-subtitles";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { subtitleFilename, subtitleRequestSchema } from "@/lib/ai/subtitles";
import { prisma } from "@/lib/prisma";
import type { SubtitleResult } from "@/types/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubtitleRow {
  videoId: string;
  language: string;
  srt: string;
  filename: string;
  source: "transcript" | "metadata";
  provider: string;
  inputHash: string;
  generatedAt: string;
}

async function ensureSubtitleTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Subtitle" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "videoId" TEXT NOT NULL,
      "language" TEXT NOT NULL,
      "srt" TEXT NOT NULL,
      "filename" TEXT NOT NULL,
      "source" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "inputHash" TEXT NOT NULL,
      "generatedAt" TEXT NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Subtitle_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "Subtitle_videoId_language_key" ON "Subtitle"("videoId", "language")',
  );
}

function toResult(row: SubtitleRow): SubtitleResult {
  return {
    videoId: row.videoId,
    language: row.language,
    srt: row.srt,
    filename: row.filename,
    source: row.source,
    provider: row.provider,
    generatedAt: row.generatedAt,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId") || "";
    const language = url.searchParams.get("language") || "en";
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || !["en", "es", "de", "fr", "pt", "id"].includes(language)) {
      return NextResponse.json({ error: "Invalid subtitle lookup." }, { status: 400 });
    }
    await ensureSubtitleTable();
    const rows = await prisma.$queryRawUnsafe<SubtitleRow[]>(
      'SELECT * FROM "Subtitle" WHERE "videoId" = ? AND "language" = ? LIMIT 1',
      videoId,
      language,
    );
    return NextResponse.json({ result: rows[0] ? toResult(rows[0]) : null });
  } catch {
    return NextResponse.json({ error: "Saved subtitles could not be loaded." }, { status: 500 });
  }
}

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
    if (contentLength > 30_000) {
      return NextResponse.json({ error: "Subtitle request is too large." }, { status: 413 });
    }
    const parsed = subtitleRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid video subtitle request." }, { status: 400 });
    }

    const input = parsed.data;
    const inputHash = createHash("sha256")
      .update(JSON.stringify({
        title: input.title,
        description: input.description,
        duration: input.duration,
        language: input.language,
      }))
      .digest("hex");
    await ensureSubtitleTable();
    const cached = await prisma.$queryRawUnsafe<SubtitleRow[]>(
      'SELECT * FROM "Subtitle" WHERE "videoId" = ? AND "language" = ? LIMIT 1',
      input.videoId,
      input.language,
    );
    if (!input.refresh && cached[0]?.inputHash === inputHash) {
      return NextResponse.json({ result: toResult(cached[0]), cached: true });
    }

    const video = await prisma.video.findUnique({ where: { id: input.videoId }, select: { id: true } });
    if (!video) {
      return NextResponse.json(
        { error: "Save or refresh the video workspace before generating subtitles." },
        { status: 409 },
      );
    }
    const generated = await generateSubtitles(input);
    const generatedAt = new Date().toISOString();
    const filename = subtitleFilename(input.title);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Subtitle"
        ("id", "videoId", "language", "srt", "filename", "source", "provider", "inputHash", "generatedAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT("videoId", "language") DO UPDATE SET
        "srt" = excluded."srt",
        "filename" = excluded."filename",
        "source" = excluded."source",
        "provider" = excluded."provider",
        "inputHash" = excluded."inputHash",
        "generatedAt" = excluded."generatedAt",
        "updatedAt" = CURRENT_TIMESTAMP`,
      cached[0] ? `${input.videoId}:${input.language}` : randomUUID(),
      input.videoId,
      input.language,
      generated.srt,
      filename,
      generated.source,
      generated.provider,
      inputHash,
      generatedAt,
    );
    const result: SubtitleResult = {
      videoId: input.videoId,
      language: input.language,
      srt: generated.srt,
      filename,
      source: generated.source,
      provider: generated.provider,
      generatedAt,
    };
    return NextResponse.json({ result, cached: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Subtitle generation failed." },
      { status: 502 },
    );
  }
}

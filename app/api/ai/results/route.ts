import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiSeoOutputSchema } from "@/lib/ai/schema";
import type { AiSeoResult } from "@/types/video";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const saveSchema = z.object({
  videoId: z.string().min(1).max(100),
  result: aiSeoOutputSchema.extend({
    provider: z.string().min(1).max(100),
    generatedAt: z.string().min(1).max(100),
  }),
});

export async function GET() {
  try {
    const rows = await prisma.aiSeoResult.findMany();
    const results = Object.fromEntries(rows.map((row) => [row.videoId, {
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      titleOptions: row.titleOptions as string[],
      descriptionOptions: row.descriptionOptions as string[],
      primaryKeyword: row.primaryKeyword,
      secondaryKeywords: row.secondaryKeywords as string[],
      relatedSearchKeywords: row.relatedSearchKeywords as string[],
      bestTitleIndex: row.bestTitleIndex,
      bestTitleReason: row.bestTitleReason,
      bestDescriptionIndex: row.bestDescriptionIndex,
      bestDescriptionReason: row.bestDescriptionReason,
      tags: row.tags as string[],
      keywords: row.keywords as string[],
      hashtags: row.hashtags as string[],
      relatedVideoSuggestions: row.relatedVideoSuggestions as Array<{ title: string; url: string }>,
      pinnedComment: row.pinnedComment,
      chapters: row.chapters as Array<{ timestamp: string; title: string }>,
      ctrSuggestions: row.ctrSuggestions as string[],
      thumbnailRedesignPrompt: row.thumbnailRedesignPrompt,
      seoScore: row.seoScore,
      provider: row.provider,
      generatedAt: row.generatedAt,
    } satisfies AiSeoResult]));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "SQLite AI results could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const parsed = saveSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid AI result." }, { status: 400 });
    }
    const { videoId, result } = parsed.data;
    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
    if (!video) {
      return NextResponse.json({ error: "Save the video workspace before its AI result." }, { status: 409 });
    }
    await prisma.aiSeoResult.upsert({
      where: { videoId },
      create: { videoId, ...result },
      update: result,
    });
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: "SQLite AI result could not be saved." }, { status: 500 });
  }
}

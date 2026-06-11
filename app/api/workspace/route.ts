import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { savedWorkspaceSchema } from "@/lib/workspace-schema";
import type { SavedWorkspace } from "@/types/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: "default" },
      include: {
        videos: {
          orderBy: { position: "asc" },
          include: { draft: true },
        },
      },
    });
    if (!workspace) return NextResponse.json({ workspace: null });

    const drafts = Object.fromEntries(
      workspace.videos
        .filter((video) => video.draft)
        .map((video) => [video.id, {
          title: video.draft!.title,
          description: video.draft!.description,
        }]),
    );
    const result: SavedWorkspace = {
      videos: workspace.videos.map((video) => ({
        id: video.id,
        title: video.title,
        description: video.description,
        url: video.url,
        thumbnail: video.thumbnail,
        uploadDate: video.uploadDate,
        duration: video.duration,
        views: video.views,
        channelName: video.channelName,
      })),
      drafts,
      selectedIds: Array.isArray(workspace.selectedIds)
        ? workspace.selectedIds.filter((id): id is string => typeof id === "string")
        : [],
      activeId: workspace.activeVideoId,
      sourceUrl: workspace.sourceUrl,
      totalAvailable: workspace.totalAvailable,
      nextOffset: workspace.nextOffset,
      hasMore: workspace.hasMore,
    };
    return NextResponse.json({ workspace: result });
  } catch {
    return NextResponse.json({ error: "SQLite workspace could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const parsed = savedWorkspaceSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid workspace data." }, { status: 400 });
    }
    const data = parsed.data;

    await prisma.$transaction(async (transaction) => {
      await transaction.workspace.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          sourceUrl: data.sourceUrl,
          activeVideoId: data.activeId,
          selectedIds: data.selectedIds,
          totalAvailable: data.totalAvailable,
          nextOffset: data.nextOffset,
          hasMore: data.hasMore,
        },
        update: {
          sourceUrl: data.sourceUrl,
          activeVideoId: data.activeId,
          selectedIds: data.selectedIds,
          totalAvailable: data.totalAvailable,
          nextOffset: data.nextOffset,
          hasMore: data.hasMore,
        },
      });

      const videoIds = data.videos.map((video) => video.id);
      await transaction.video.deleteMany({
        where: { workspaceId: "default", id: { notIn: videoIds } },
      });
      for (const [position, video] of data.videos.entries()) {
        await transaction.video.upsert({
          where: { id: video.id },
          create: { ...video, position, workspaceId: "default" },
          update: { ...video, position, workspaceId: "default" },
        });
        const draft = data.drafts[video.id];
        if (draft) {
          await transaction.seoDraft.upsert({
            where: { videoId: video.id },
            create: { videoId: video.id, ...draft },
            update: draft,
          });
        } else {
          await transaction.seoDraft.deleteMany({ where: { videoId: video.id } });
        }
      }
    });
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: "SQLite workspace could not be saved." }, { status: 500 });
  }
}

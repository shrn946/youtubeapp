import { z } from "zod";

const videoSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().max(1000),
  description: z.string().max(100_000),
  url: z.string().url().max(2000),
  thumbnail: z.string().max(2000),
  uploadDate: z.string().nullable(),
  duration: z.number().int().min(0),
  views: z.number().int().min(0),
  channelName: z.string().max(1000),
});

const draftSchema = z.object({
  title: z.string().max(1000),
  description: z.string().max(100_000),
});

export const savedWorkspaceSchema = z.object({
  videos: z.array(videoSchema).max(10_000),
  drafts: z.record(z.string(), draftSchema),
  selectedIds: z.array(z.string().max(100)).max(10_000),
  activeId: z.string().max(100).nullable(),
  sourceUrl: z.string().max(2000),
  totalAvailable: z.number().int().min(0),
  nextOffset: z.number().int().min(0),
  hasMore: z.boolean(),
});

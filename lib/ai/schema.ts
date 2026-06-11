import { z } from "zod";

export const aiSeoInputSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().max(20_000),
  channelName: z.string().trim().max(500),
  videoUrl: z.string().url().max(1000),
  thumbnailUrl: z.string().max(2000).optional().default("").refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:"
        && !url.username
        && !url.password
        && !url.port
        && (url.hostname === "img.youtube.com" || url.hostname.endsWith(".ytimg.com"));
    } catch {
      return false;
    }
  }, "Invalid YouTube thumbnail URL."),
  duration: z.number().int().min(0).max(86400).optional().default(0),
  relatedVideos: z.array(z.object({
    title: z.string().trim().min(1).max(500),
    url: z.string().url().max(1000),
  })).max(5).optional().default([]),
  protectedLinks: z.array(z.string().url().max(2000)).max(50).optional().default([]),
});

export const aiSeoOutputSchema = z.object({
  seoTitle: z.string().trim().min(1).max(70),
  seoDescription: z.string().trim().min(1).max(5000),
  titleOptions: z.array(z.string().trim().min(1).max(70)).min(10).max(10),
  descriptionOptions: z.array(z.string().trim().min(1).max(5000)).min(3).max(3),
  primaryKeyword: z.string().trim().min(1).max(150),
  secondaryKeywords: z.array(z.string().trim().min(1).max(150)).min(5).max(10),
  relatedSearchKeywords: z.array(z.string().trim().min(1).max(250)).min(10).max(20),
  bestTitleIndex: z.number().int().min(0).max(9),
  bestTitleReason: z.string().trim().min(1).max(500),
  bestDescriptionIndex: z.number().int().min(0).max(2),
  bestDescriptionReason: z.string().trim().min(1).max(500),
  tags: z.array(z.string().trim().min(1).max(100)).min(10).max(20),
  keywords: z.array(z.string().trim().min(1).max(150)).min(10).max(10),
  hashtags: z.array(z.string().trim().min(1).max(100)).min(5).max(10),
  relatedVideoSuggestions: z.array(z.object({
    title: z.string().trim().min(1).max(500),
    url: z.string().url().max(1000),
  })).max(5),
  pinnedComment: z.string().trim().min(1).max(2000),
  chapters: z.array(z.object({
    timestamp: z.string().regex(/^\d{1,2}:\d{2}(?::\d{2})?$/),
    title: z.string().trim().min(1).max(150),
  })).min(3).max(20),
  ctrSuggestions: z.array(z.string().trim().min(1).max(500)).min(3).max(8),
  thumbnailScore: z.number().int().min(1).max(100),
  thumbnailScoreReason: z.string().trim().min(1).max(1000),
  thumbnailRedesignPrompt: z.string().trim().min(1).max(4000),
  seoScore: z.number().int().min(1).max(100),
});

export const aiSeoJsonSchema = {
  type: "object",
  properties: {
    seoTitle: { type: "string", description: "Best title, maximum 70 characters." },
    seoDescription: { type: "string", description: "Best complete YouTube description." },
    titleOptions: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: { type: "string" },
    },
    descriptionOptions: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    primaryKeyword: { type: "string" },
    secondaryKeywords: {
      type: "array",
      minItems: 5,
      maxItems: 10,
      items: { type: "string" },
    },
    relatedSearchKeywords: {
      type: "array",
      minItems: 10,
      maxItems: 20,
      items: { type: "string" },
    },
    bestTitleIndex: {
      type: "integer",
      minimum: 0,
      maximum: 9,
      description: "Zero-based index of the strongest title option.",
    },
    bestTitleReason: {
      type: "string",
      description: "Brief reason this title best improves the original.",
    },
    bestDescriptionIndex: {
      type: "integer",
      minimum: 0,
      maximum: 2,
      description: "Zero-based index of the strongest description option.",
    },
    bestDescriptionReason: {
      type: "string",
      description: "Brief reason this description best improves the original.",
    },
    tags: {
      type: "array",
      minItems: 10,
      maxItems: 20,
      items: { type: "string" },
    },
    keywords: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: { type: "string" },
    },
    hashtags: {
      type: "array",
      minItems: 5,
      maxItems: 10,
      items: { type: "string" },
    },
    relatedVideoSuggestions: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
        },
        required: ["title", "url"],
      },
    },
    pinnedComment: { type: "string" },
    chapters: {
      type: "array",
      minItems: 3,
      maxItems: 20,
      items: {
        type: "object",
        properties: {
          timestamp: { type: "string" },
          title: { type: "string" },
        },
        required: ["timestamp", "title"],
      },
    },
    ctrSuggestions: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: { type: "string" },
    },
    thumbnailScore: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      description: "Current thumbnail quality score based on clarity, focal result, text, contrast, and mobile readability.",
    },
    thumbnailScoreReason: {
      type: "string",
      description: "Concise evidence-based explanation of the current thumbnail score.",
    },
    thumbnailRedesignPrompt: {
      type: "string",
      description: "A production-ready image editing prompt based on the supplied thumbnail.",
    },
    seoScore: { type: "integer", minimum: 1, maximum: 100 },
  },
  required: [
    "seoTitle",
    "seoDescription",
    "titleOptions",
    "descriptionOptions",
    "primaryKeyword",
    "secondaryKeywords",
    "relatedSearchKeywords",
    "bestTitleIndex",
    "bestTitleReason",
    "bestDescriptionIndex",
    "bestDescriptionReason",
    "tags",
    "keywords",
    "hashtags",
    "relatedVideoSuggestions",
    "pinnedComment",
    "chapters",
    "ctrSuggestions",
    "thumbnailScore",
    "thumbnailScoreReason",
    "thumbnailRedesignPrompt",
    "seoScore",
  ],
} as const;

import "server-only";
import { z } from "zod";

export const topicClusterInputSchema = z.object({
  selectedTopic: z.string().trim().min(3).max(200),
  category: z.string().trim().min(3).max(100),
  channelName: z.string().trim().max(500),
  existingTitles: z.array(z.string().trim().min(1).max(500)).max(1000),
  previousSuggestions: z.array(z.string().trim().min(1).max(200)).max(20).optional().default([]),
});

export const topicClusterOutputSchema = z.object({
  strategy: z.string().trim().min(40).max(1000),
  primaryVideo: z.object({
    title: z.string().trim().min(1).max(100),
    angle: z.string().trim().min(20).max(500),
  }),
  relatedContent: z.array(z.object({
    title: z.string().trim().min(1).max(100),
    contentType: z.enum(["Tutorial", "Troubleshooting", "Comparison", "Short", "Follow-up"]),
    reason: z.string().trim().min(20).max(500),
    priority: z.enum(["High", "Medium"]),
  })).min(6).max(8),
});

export const topicClusterJsonSchema = {
  type: "object",
  properties: {
    strategy: { type: "string" },
    primaryVideo: {
      type: "object",
      properties: {
        title: { type: "string" },
        angle: { type: "string" },
      },
      required: ["title", "angle"],
    },
    relatedContent: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          contentType: {
            type: "string",
            enum: ["Tutorial", "Troubleshooting", "Comparison", "Short", "Follow-up"],
          },
          reason: { type: "string" },
          priority: { type: "string", enum: ["High", "Medium"] },
        },
        required: ["title", "contentType", "reason", "priority"],
      },
    },
  },
  required: ["strategy", "primaryVideo", "relatedContent"],
} as const;

export type TopicClusterInput = z.infer<typeof topicClusterInputSchema>;
export type TopicClusterResult = z.infer<typeof topicClusterOutputSchema> & {
  provider: string;
  generatedAt: string;
};

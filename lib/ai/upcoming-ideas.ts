import "server-only";
import { z } from "zod";

export const upcomingIdeasInputSchema = z.object({
  channelName: z.string().trim().max(500),
  videos: z.array(z.object({
    title: z.string().trim().min(1).max(500),
    uploadDate: z.string().nullable(),
    views: z.number().int().min(0),
  })).min(1).max(1000),
});

export const upcomingVideoIdeaSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(80).max(1200),
  reason: z.string().trim().min(40).max(800),
  searchPotential: z.enum(["High", "Medium", "Emerging"]),
  contentGap: z.string().trim().min(40).max(800),
});

export const upcomingIdeasOutputSchema = z.object({
  niche: z.string().trim().min(1).max(300),
  ideas: z.array(upcomingVideoIdeaSchema).min(6).max(10),
});

export const upcomingIdeasJsonSchema = {
  type: "object",
  properties: {
    niche: {
      type: "string",
      description: "A concise description of the channel niche inferred from the supplied catalog.",
    },
    ideas: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "A natural, high-search-intent YouTube title, ideally 50-70 characters.",
          },
          description: {
            type: "string",
            description: "An SEO-friendly 2-3 paragraph video description with a clear viewer outcome.",
          },
          reason: {
            type: "string",
            description: "Why this fits the channel and fills a gap relative to existing videos.",
          },
          searchPotential: {
            type: "string",
            enum: ["High", "Medium", "Emerging"],
            description: "Estimated demand tier based on search intent, evergreen utility, and general topic momentum.",
          },
          contentGap: {
            type: "string",
            description: "The specific missing angle, workflow, comparison, or audience need not covered by existing titles.",
          },
        },
        required: ["title", "description", "reason", "searchPotential", "contentGap"],
      },
    },
  },
  required: ["niche", "ideas"],
} as const;

export type UpcomingIdeasInput = z.infer<typeof upcomingIdeasInputSchema>;
export type UpcomingVideoIdea = z.infer<typeof upcomingVideoIdeaSchema>;
export type UpcomingIdeasResult = z.infer<typeof upcomingIdeasOutputSchema> & {
  provider: string;
  generatedAt: string;
};

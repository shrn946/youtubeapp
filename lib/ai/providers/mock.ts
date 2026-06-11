import "server-only";
import type { AiProvider } from "@/lib/ai/provider";
import { formatAiDescription } from "@/lib/ai/format-description";
import { analyzeSeo, generateSeoDraft, primaryKeyword } from "@/lib/seo";
import type { AiSeoInput, AiSeoResult, Video } from "@/types/video";

export class MockProvider implements AiProvider {
  readonly name = "mock";

  async generateSeo(input: AiSeoInput): Promise<AiSeoResult> {
    const video = {
      id: "mock",
      title: input.title,
      description: input.description,
      url: input.videoUrl,
      channelName: input.channelName,
      thumbnail: "",
      uploadDate: null,
      duration: 0,
      views: 0,
    } satisfies Video;
    const draft = generateSeoDraft(video);
    const keyword = primaryKeyword(input.title) || "youtube";
    const titleOptions = [
      draft.title,
      `${input.title.slice(0, 50)}: Complete Guide`,
      `How to ${input.title.slice(0, 54)}`,
      `7 Practical Tips for ${input.title.slice(0, 43)}`,
      `${input.title.slice(0, 48)} Made Simple`,
      `${keyword}: Step-by-Step Tutorial`,
      `Master ${input.title.slice(0, 50)}`,
      `${input.title.slice(0, 45)} for Beginners`,
      `The Complete ${input.title.slice(0, 50)} Guide`,
      `${input.title.slice(0, 46)}: Tips and Examples`,
    ].map((title) => title.slice(0, 70));
    const secondaryKeywords = Array.from({ length: 8 }, (_, index) => `${keyword} topic ${index + 1}`);
    const relatedSearchKeywords = Array.from({ length: 12 }, (_, index) => `how to use ${keyword} example ${index + 1}`);
    const tags = Array.from({ length: 12 }, (_, index) => `${keyword} tip ${index + 1}`);
    const hashtags = Array.from({ length: 6 }, (_, index) => `#${keyword}${index + 1}`);
    const description = formatAiDescription(draft.description, input, {
      primaryKeyword: keyword,
      secondaryKeywords,
      relatedSearchKeywords,
      tags,
      hashtags,
    });
    return {
      seoTitle: titleOptions[0],
      seoDescription: description,
      titleOptions,
      descriptionOptions: [description, description, description],
      primaryKeyword: keyword,
      secondaryKeywords,
      relatedSearchKeywords,
      bestTitleIndex: 0,
      bestTitleReason: "This option places the main topic early and communicates a clear viewer benefit.",
      bestDescriptionIndex: 0,
      bestDescriptionReason: "This variation gives the clearest opening summary, formatting, resources, and call to action.",
      tags,
      keywords: Array.from({ length: 10 }, (_, index) => `${keyword} keyword ${index + 1}`),
      hashtags,
      relatedVideoSuggestions: input.relatedVideos ?? [],
      pinnedComment: `What is your biggest question about ${keyword}? Share it below and subscribe for more tutorials.`,
      chapters: [
        { timestamp: "00:00", title: "Introduction" },
        { timestamp: "00:30", title: "Setup and requirements" },
        { timestamp: "02:00", title: "Step-by-step tutorial" },
        { timestamp: "06:00", title: "Customization tips" },
        { timestamp: "09:00", title: "Final result" },
      ],
      ctrSuggestions: [
        "Move the primary keyword closer to the beginning.",
        "State the viewer benefit more clearly.",
        "Use a specific number only when the content supports it.",
      ],
      thumbnailRedesignPrompt: `Redesign this YouTube thumbnail for "${input.title}" as a clean, professional 16:9 composition at 1280x720. Preserve the main subject from the original thumbnail, simplify the background, use strong subject separation, high contrast, and one clear focal point. Add no more than 3-5 words of large readable text based on "${keyword}", with generous safe margins for mobile viewing. Use a polished modern web-design tutorial aesthetic, crisp lighting, saturated but controlled colors, and no invented logos, badges, claims, or people.`,
      seoScore: analyzeSeo(draft.title, description, input.title).score,
      provider: this.name,
      generatedAt: new Date().toISOString(),
    };
  }
}

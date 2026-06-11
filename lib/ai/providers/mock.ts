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
      `${keyword} Tutorial | Step-by-Step Setup`,
      `${keyword} Tutorial | Build It Without Code`,
      `${keyword} Guide | Setup and Customization`,
      `How To Create ${keyword} | WordPress Tutorial`,
      `${keyword} Tutorial | Responsive Web Design`,
      `${keyword} Tutorial | Free Setup Guide`,
      `${keyword} Guide | Practical WordPress Workflow`,
      `${keyword} Tutorial | Elementor Setup`,
      `How To Use ${keyword} | Beginner Tutorial`,
      `${keyword} Tutorial | Design and Configuration`,
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
      thumbnailScore: 60,
      thumbnailScoreReason: "The mock provider cannot inspect the image, so this provisional score treats it as a generic screenshot until a vision-capable provider analyzes the focal result, text, contrast, clutter, and mobile readability.",
      thumbnailRedesignPrompt: `Create a professional 16:9 YouTube thumbnail at 1280x720 for "${input.title}". Show the completed ${keyword} result as the main focal point occupying 60-70% of the canvas. Use a dark modern background, a bright high-contrast focal element, large bold white text reading "${keyword.toUpperCase().slice(0, 30)}" in only 2-4 words, a subtle glow, and one red arrow pointing to the most impressive feature. Add at most one relevant WordPress, Elementor, or WooCommerce logo in a corner. Focus on the final visual result rather than the editing interface. Keep the composition clean, readable at 168x94 pixels, and free from excessive text or decorative clutter.`,
      seoScore: Math.max(1, analyzeSeo(draft.title, description, input.title).score),
      provider: this.name,
      generatedAt: new Date().toISOString(),
    };
  }
}

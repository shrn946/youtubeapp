import "server-only";
import {
  upcomingIdeasJsonSchema,
  upcomingIdeasOutputSchema,
  type UpcomingIdeasInput,
  type UpcomingIdeasResult,
} from "@/lib/ai/upcoming-ideas";

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

function mockIdeas(input: UpcomingIdeasInput): UpcomingIdeasResult {
  const topics = input.videos.slice(0, 8).map((video) => video.title.replace(/\s*[|:-].*$/, "").trim());
  const seeds = topics.length ? topics : ["WordPress", "Elementor"];
  const ideas = Array.from({ length: 8 }, (_, index) => {
    const topic = seeds[index % seeds.length];
    return {
      title: `${topic} Advanced Tutorial: Practical Workflow ${index + 1}`.slice(0, 100),
      description: `Learn an advanced, practical workflow related to ${topic}. This tutorial will walk viewers through setup, implementation, responsive checks, and common fixes.\n\nThe video is designed for viewers searching for a clear, reusable solution they can apply to real WordPress and web design projects.`,
      reason: `This extends the channel's existing coverage of ${topic} with a more focused advanced workflow while avoiding an exact repeat of the supplied catalog titles.`,
      searchPotential: index < 3 ? "High" as const : index < 6 ? "Medium" as const : "Emerging" as const,
      contentGap: `The current catalog covers ${topic}, but it does not appear to address this specific advanced workflow, implementation path, and troubleshooting angle in one focused tutorial.`,
    };
  });
  return {
    niche: `Tutorial content related to ${seeds.slice(0, 3).join(", ")}`,
    ideas,
    provider: "mock",
    generatedAt: new Date().toISOString(),
  };
}

async function geminiIdeas(input: UpcomingIdeasInput): Promise<UpcomingIdeasResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: [
                "You are a YouTube content strategist and SEO researcher.",
                "Infer the channel niche and content strategy only from the supplied video catalog.",
                "Return exactly 8 upcoming video ideas that fit the niche.",
                "Do not suggest a topic that duplicates or closely paraphrases an existing title.",
                "Treat tutorials covering the same feature, plugin, widget, effect, or outcome as duplicates even when wording differs.",
                "Prefer meaningful content gaps, follow-up depth, adjacent workflows, comparisons, troubleshooting, integrations, and updated evergreen tutorials.",
                "Prioritize high-search-intent and evergreen topics. You may use general trend knowledge, but do not claim access to live search-volume or current trend data.",
                "Each title must be accurate, natural, specific, and ideally 50-70 characters.",
                "Each description must be SEO-friendly, useful, and explain the viewer outcome in 2-3 short paragraphs.",
                "Each reason must cite the channel pattern or content gap visible in the supplied catalog and explain why the idea is not a duplicate.",
                "Classify estimated search potential as High, Medium, or Emerging. Base it on explicit search intent, evergreen usefulness, broad audience applicability, and general topic momentum, not claimed live search volume.",
                "Provide a separate contentGap field that names the missing angle and references what the existing catalog covers or omits.",
                "Use views only as a relative signal of audience interest within this channel.",
                "Return only schema-compliant JSON.",
              ].join(" "),
            }],
          },
          contents: [{
            role: "user",
            parts: [{
              text: JSON.stringify({
                task: "Generate upcoming YouTube video ideas from this existing channel catalog.",
                channel: input,
              }),
            }],
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: upcomingIdeasJsonSchema,
          },
        }),
      },
    );
    const payload = await response.json() as GeminiResponse;
    if (!response.ok) throw new Error(payload.error?.message || `Gemini request failed (${response.status}).`);
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    if (!text) throw new Error("Gemini returned an empty response.");
    const result = upcomingIdeasOutputSchema.parse(JSON.parse(text));
    return { ...result, provider: "gemini", generatedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Upcoming ideas generation timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateUpcomingIdeas(input: UpcomingIdeasInput): Promise<UpcomingIdeasResult> {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  if (provider === "gemini") return geminiIdeas(input);
  if (provider === "mock") return mockIdeas(input);
  throw new Error(`Upcoming ideas are not implemented for AI provider: ${provider}.`);
}

import "server-only";
import {
  topicClusterJsonSchema,
  topicClusterOutputSchema,
  type TopicClusterInput,
  type TopicClusterResult,
} from "@/lib/ai/topic-cluster";

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

function mockCluster(input: TopicClusterInput): TopicClusterResult {
  const types = ["Tutorial", "Troubleshooting", "Comparison", "Short", "Follow-up"] as const;
  return {
    strategy: `Build a focused series around ${input.selectedTopic}, starting with the direct fix and expanding into diagnosis, prevention, alternatives, and common related failures.`,
    primaryVideo: {
      title: input.selectedTopic,
      angle: "Show the fastest safe fix first, then explain the likely causes and verification steps.",
    },
    relatedContent: Array.from({ length: 8 }, (_, index) => ({
      title: `${input.selectedTopic}: Related Solution ${index + 1}`.slice(0, 100),
      contentType: types[index % types.length],
      reason: "This extends the selected problem into a distinct search intent without repeating the main tutorial.",
      priority: index < 4 ? "High" as const : "Medium" as const,
    })),
    provider: "mock",
    generatedAt: new Date().toISOString(),
  };
}

export async function generateTopicCluster(input: TopicClusterInput): Promise<TopicClusterResult> {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  if (provider === "mock") return mockCluster(input);
  if (provider !== "gemini") {
    throw new Error(`Topic suggestions are not implemented for AI provider: ${provider}.`);
  }

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
                "You are a YouTube content strategist for a WordPress troubleshooting channel.",
                "Given one selected topic, design a tightly related content cluster.",
                "The primary video must directly solve the selected problem.",
                "Related videos must target distinct but adjacent search intents: diagnosis, alternative fixes, prevention, plugin-specific cases, comparisons, shorts, or follow-ups.",
                "Do not invent live search-volume claims and do not promise RPM or revenue.",
                "Avoid titles already present in the supplied channel catalog.",
                "When previous suggestions are supplied, produce substantially different angles and titles instead of paraphrasing them.",
                "Keep titles natural, specific, and suitable for YouTube search.",
                "Return exactly 8 related content recommendations as schema-compliant JSON.",
              ].join(" "),
            }],
          },
          contents: [{
            role: "user",
            parts: [{
              text: JSON.stringify({
                task: "Recommend the related content I should make for this selected topic.",
                selectedTopic: input.selectedTopic,
                category: input.category,
                channelName: input.channelName,
                existingTitles: input.existingTitles,
                previousSuggestions: input.previousSuggestions,
              }),
            }],
          }],
          generationConfig: {
            temperature: input.previousSuggestions.length ? 0.9 : 0.7,
            maxOutputTokens: 6144,
            responseMimeType: "application/json",
            responseSchema: topicClusterJsonSchema,
          },
        }),
      },
    );
    const payload = await response.json() as GeminiResponse;
    if (!response.ok) throw new Error(payload.error?.message || `Gemini request failed (${response.status}).`);
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    if (!text) throw new Error("Gemini returned an empty response.");
    const result = topicClusterOutputSchema.parse(JSON.parse(text));
    return { ...result, provider: "gemini", generatedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Topic suggestion generation timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

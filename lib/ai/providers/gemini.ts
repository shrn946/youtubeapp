import "server-only";
import type { AiProvider } from "@/lib/ai/provider";
import { formatAiDescription } from "@/lib/ai/format-description";
import { aiSeoJsonSchema, aiSeoOutputSchema } from "@/lib/ai/schema";
import type { AiSeoInput, AiSeoResult } from "@/types/video";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isAllowedThumbnailUrl(value: string): boolean {
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
}

async function fetchThumbnailPart(
  thumbnailUrl: string,
  signal: AbortSignal,
): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  if (!thumbnailUrl) return null;
  if (!isAllowedThumbnailUrl(thumbnailUrl)) {
    throw new Error("The thumbnail URL is not a supported YouTube image.");
  }

  const response = await fetch(thumbnailUrl, { signal, redirect: "follow" });
  if (!response.ok || !isAllowedThumbnailUrl(response.url)) {
    throw new Error("The YouTube thumbnail could not be downloaded.");
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "";
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw new Error("The YouTube thumbnail has an unsupported image format.");
  }
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_THUMBNAIL_BYTES) {
    throw new Error("The YouTube thumbnail is too large for AI analysis.");
  }

  if (!response.body) {
    throw new Error("The YouTube thumbnail returned no image data.");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_THUMBNAIL_BYTES) {
      await reader.cancel();
      throw new Error("The YouTube thumbnail is too large for AI analysis.");
    }
    chunks.push(value);
  }
  const imageData = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  return {
    inlineData: {
      mimeType,
      data: imageData.toString("base64"),
    },
  };
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  async generateSeo(input: AiSeoInput): Promise<AiSeoResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const thumbnailPart = await fetchThumbnailPart(input.thumbnailUrl || "", controller.signal);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
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
                  "You are a YouTube SEO specialist.",
                  "Return only schema-compliant JSON.",
                  "First analyze the supplied original title and original description, then create natural, accurate improvements based only on that metadata.",
                  "The suggested title and description must improve clarity, search intent, keyword placement, readability, and click-through potential without changing the video's meaning.",
                  "Return exactly 10 distinct SEO title options. Each must be natural, accurate, keyword-aware, non-repetitive, and at most 70 characters.",
                  "Choose one focused primary keyword, 5-10 secondary keywords, and 10-20 natural long-tail related searches people might type into YouTube.",
                  "For WordPress topics, use relevant terms such as WordPress Tutorial, Elementor Tutorial, WordPress Plugin, Elementor Widget, Web Design, Responsive Design, WordPress Development, Website Animation, GSAP Animation, and WP Design Lab only when they match the actual video.",
                  "Never invent claims, statistics, links, products, or facts.",
                  "Avoid deceptive clickbait and keyword stuffing.",
                  "Every title must be 70 characters or fewer.",
                  "Descriptions need a keyword-rich first 150 characters, clear formatting, and a call to action.",
                  "Use readable YouTube formatting throughout every description: separate the opening hook, explanation, topics, resources, call to action, and related videos with one completely blank line.",
                  "The first paragraph must naturally contain the primary keyword. The second paragraph must explain what viewers will learn.",
                  "The description must contain these clearly labeled sections: Topics Covered, Resources when protected links exist, Related Videos when supplied, Related Searches, Focus Keywords, Tags, and a final line with 3-5 relevant hashtags.",
                  "Use one item per line in Topics Covered, Related Searches, and Focus Keywords. Keep Tags comma-separated. Avoid keyword stuffing and do not repeat identical phrases unnecessarily.",
                  "Keep the complete final description concise enough for YouTube's 5,000-character description limit.",
                  "The server will append a fixed WP Design Lab subscription block at the very end. Do not create or duplicate a subscription URL in the generated description.",
                  "For WordPress content, prioritize specific intent phrases such as WordPress tutorial, Elementor tutorial, web design, responsive design, and the exact feature being taught, but only when relevant.",
                  "Structure WordPress descriptions as: search-focused opening hook, clear viewer outcome, scannable topics covered, practical call to action, then related videos.",
                  "Use the exact feature name naturally near the start. Avoid repeating WordPress or Elementor unnaturally.",
                  "The protectedLinks list contains plugin, download, affiliate, website, social, and resource URLs from the original description.",
                  "Preserve every protected link exactly character-for-character in every description variation. Do not rewrite, shorten, replace, remove, or attach a different label to these URLs.",
                  "This protection includes GitHub plugin URLs. Copy each protected GitHub URL exactly as supplied.",
                  "Place preserved resource links in a clear Resources or Links section before Related Videos.",
                  "Every description variation must end with a 'Related Videos' section using the supplied related video titles and exact URLs.",
                  "Format each related video as two lines: first its title, then its exact URL. Add one completely blank line after every related video URL, including between entries.",
                  "Never create, alter, shorten, or guess a related video URL. If no related videos are supplied, omit that section.",
                  "relatedVideoSuggestions must contain only supplied relatedVideos entries, copied exactly.",
                  "Write a natural pinned comment that encourages discussion and includes a concise call to action without spam.",
                  "Generate useful chapter suggestions beginning at 00:00. Use the supplied duration as the upper boundary, never output a timestamp beyond it, and infer a plausible sequence without claiming exact timing accuracy.",
                  "Analyze the supplied current YouTube thumbnail image before writing thumbnailRedesignPrompt.",
                  "thumbnailRedesignPrompt must be one detailed, production-ready prompt for an image generation or image editing model to redesign that specific thumbnail.",
                  "Ground the prompt in visible evidence from the current thumbnail: identify the subject, composition, background, colors, text treatment, strengths, and weaknesses, then prescribe a stronger design aligned with the video's actual title.",
                  "Specify a 16:9 YouTube thumbnail at 1280x720, a single clear focal point, strong subject-background separation, mobile readability, safe margins, high contrast, and no more than 3-5 words of proposed on-image text.",
                  "Preserve a real person's identity and recognizable product/interface elements when present. Do not invent people, logos, claims, awards, UI results, or brand assets that are not supported by the image or metadata.",
                  "Write the thumbnail prompt so it can be copied directly into an image generation tool. Do not include analysis outside the prompt.",
                  "Choose the single best title and best description by returning their zero-based option indexes and concise reasons.",
                  "seoTitle must exactly equal titleOptions[bestTitleIndex]. seoDescription must exactly equal descriptionOptions[bestDescriptionIndex].",
                  "Hashtags must start with # and tags must not include #.",
                  "Keep the combined tags focused and concise; do not exceed roughly 500 characters.",
                ].join(" "),
              }],
            },
            contents: [{
              role: "user",
              parts: [{
                text: JSON.stringify({
                  task: "Generate a complete YouTube SEO optimization package.",
                  requirements: {
                    titleAlternatives: 10,
                    descriptionVariations: 3,
                    primaryKeyword: 1,
                    secondaryKeywords: "5-10",
                    relatedSearchKeywords: "10-20",
                    tags: "10-20",
                    focusKeywords: 10,
                    hashtags: "5-10",
                    relatedVideoSuggestions: "Use only supplied related videos",
                    pinnedComment: 1,
                    videoChapters: "3-20, starting at 00:00",
                    ctrSuggestions: "3-8 actionable suggestions",
                    thumbnailRedesignPrompt: "One image-aware, production-ready redesign prompt",
                  },
                  video: input,
                }),
              }, ...(thumbnailPart ? [thumbnailPart] : [])],
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 16384,
              responseMimeType: "application/json",
              responseSchema: aiSeoJsonSchema,
            },
          }),
        },
      );

      const payload = await response.json() as GeminiResponse;
      if (!response.ok) {
        throw new Error(payload.error?.message || `Gemini request failed (${response.status}).`);
      }
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
      if (!text) throw new Error("Gemini returned an empty response.");
      const result = aiSeoOutputSchema.parse(JSON.parse(text));
      const descriptionOptions = result.descriptionOptions.map((description) =>
        formatAiDescription(description, input, result),
      );
      return {
        ...result,
        seoTitle: result.titleOptions[result.bestTitleIndex],
        seoDescription: descriptionOptions[result.bestDescriptionIndex],
        descriptionOptions,
        provider: this.name,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Gemini request timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

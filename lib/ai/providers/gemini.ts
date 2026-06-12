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
                  "You are a professional YouTube SEO expert specializing in WordPress, Elementor, WooCommerce, and web design tutorials.",
                  "Return only schema-compliant JSON.",
                  "First analyze the supplied original title and original description, then create natural, accurate improvements based only on that metadata.",
                  "The suggested title and description must improve clarity, search intent, keyword placement, readability, and click-through potential without changing the video's meaning.",
                  "Use this title formula: Primary Keyword + Tutorial + Main Benefit.",
                  "Put the primary keyword at the beginning and prioritize search intent over marketing language.",
                  "Use Tutorial, Guide, How To, or Free only when relevant and supported by the source metadata.",
                  "Preserve plugin, product, and brand names exactly.",
                  "Avoid vague marketing words including Amazing, Stunning, Epic, Ultimate, Best, Incredible, and Must-Have.",
                  "Keep titles between 50 and 70 characters when possible, with an absolute maximum of 70 characters.",
                  "If the current title already follows the formula and contains strong search keywords, keep its meaning and wording mostly unchanged.",
                  "If the current title uses vague marketing language, rewrite it completely using the title formula.",
                  "Return exactly 10 distinct SEO title options. Each must be natural, accurate, search-focused, non-repetitive, and at most 70 characters.",
                  "Choose one focused primary keyword, 5-10 secondary keywords, and 10-20 natural long-tail related searches people might type into YouTube.",
                  "Use relevant secondary terms related to WordPress, Elementor, WooCommerce, web design, plugins, widgets, animations, galleries, sliders, menus, forms, or the exact video topic only when they naturally match.",
                  "Never invent claims, statistics, links, products, or facts.",
                  "Avoid deceptive clickbait and keyword stuffing.",
                  "Each description variation must contain at least 250 words and remain within YouTube's 5,000-character limit.",
                  "Follow this description order: keyword-rich introduction of 2-3 sentences; what viewers will learn; main features and benefits; plugin or resource links; related tutorial recommendations; strong call to action; relevant hashtags.",
                  "Place the primary keyword naturally within the first two sentences and within the first 150 characters when practical.",
                  "Write for humans first, use clear headings and bullet points, and create a genuinely unique description for this video.",
                  "The call to action must naturally encourage viewers to like the video, leave a relevant comment, and subscribe.",
                  "Use readable YouTube formatting throughout every description: separate the opening hook, explanation, topics, resources, call to action, and related videos with one completely blank line.",
                  "The first paragraph must naturally contain the primary keyword. The second paragraph must explain what viewers will learn.",
                  "The description must contain these clearly labeled sections: Topics Covered, Resources when protected links exist, Related Videos when supplied, Focus Keywords, Tags, and a final line with 3-5 relevant hashtags.",
                  "Write Topics Covered as 5-8 specific, viewer-focused takeaways rather than a raw keyword list. Use one item per line in Topics Covered and Focus Keywords. Keep Tags comma-separated. Avoid keyword stuffing and do not repeat identical phrases unnecessarily.",
                  "Keep the complete final description concise enough for YouTube's 5,000-character description limit.",
                  "The server will append a fixed WP Design Lab subscription block at the very end. Do not create or duplicate a subscription URL in the generated description.",
                  "For WordPress content, prioritize specific intent phrases such as WordPress tutorial, Elementor tutorial, web design, responsive design, and the exact feature being taught, but only when relevant.",
                  "Structure WordPress descriptions as: search-focused opening hook, clear viewer outcome, scannable topics covered, practical call to action, then related videos.",
                  "Use the exact feature name naturally near the start. Avoid repeating WordPress or Elementor unnaturally.",
                  "The protectedLinks list contains plugin, download, affiliate, website, social, and resource URLs from the original description.",
                  "Preserve every protected link exactly character-for-character in every description variation. Do not rewrite, shorten, replace, remove, or attach a different label to these URLs.",
                  "This protection includes GitHub plugin URLs. Copy each protected GitHub URL exactly as supplied.",
                  "Place Related Videos immediately after the Resources or Links section. When there are no resource links, place Related Videos immediately after Topics Covered.",
                  "The server formats plugin and resource links with a plug icon, related videos with a play icon, and the subscription block with a bell icon. Do not add competing icons or duplicate these sections.",
                  "Every description variation must end with a 'Related Videos' section using the supplied related video titles and exact URLs.",
                  "Format each related video as two lines: first its title, then its exact URL. Add one completely blank line after every related video URL, including between entries.",
                  "Never create, alter, shorten, or guess a related video URL. If no related videos are supplied, omit that section.",
                  "relatedVideoSuggestions must contain only supplied relatedVideos entries, copied exactly.",
                  "Write a natural pinned comment that encourages discussion and includes a concise call to action without spam.",
                  "Generate useful chapter suggestions beginning at 00:00. Use the supplied duration as the upper boundary, never output a timestamp beyond it, and infer a plausible sequence without claiming exact timing accuracy.",
                  "Score SEO from 1 to 100 using keyword relevance, search intent, click-through potential, description quality, and content completeness.",
                  "bestTitleReason must clearly explain what was preserved or changed compared with the current title, including keyword placement, search intent, and any removed vague marketing language.",
                  "bestDescriptionReason must explain how the description improves keyword placement, structure, completeness, readability, and calls to action.",
                  "Analyze the supplied current YouTube thumbnail image before writing thumbnailRedesignPrompt.",
                  "Use this thumbnail formula for WordPress, Elementor, WooCommerce, and web design tutorials: Result + Focal Element + Short Text.",
                  "The completed widget, effect, animation, slider, gallery, menu, card, form, product carousel, or layout must be the main focal point and occupy roughly 60-70% of the redesigned thumbnail.",
                  "Focus on the final visual result rather than the editing interface.",
                  "Propose only 2-4 words of large on-image text that names the result directly, such as HEXAGON GALLERY, 3D PRODUCT SLIDER, OFF CANVAS MENU, GLOW CARDS, MOUSE TRAIL, or GSAP BACKGROUND.",
                  "Use at most one relevant Elementor, WordPress, or WooCommerce logo. Never add a logo when it is not relevant or visible branding cannot be safely inferred.",
                  "Use a dark modern background, a bright focal element, white text, yellow highlights, and a red arrow when it helps identify the most impressive feature.",
                  "Use only one or two controlled emphasis devices, such as a red arrow, subtle glow, zoom circle, before-and-after comparison, motion indicator, or highlighted feature. Avoid clutter.",
                  "The design must remain immediately understandable and text must remain readable at 168x94 pixels.",
                  "Score the current thumbnail from 1-100. Use these anchors: 100 excellent; 90 clear visual result with short text; 80 good result but slightly cluttered; 70 too much text; 60 generic screenshot; 50 difficult to understand; 40 no focal point.",
                  "thumbnailScoreReason must identify the visible result, focal-point clarity, amount and readability of text, contrast, clutter, branding relevance, and mobile readability. Mention only evidence visible in the supplied image.",
                  "thumbnailRedesignPrompt must be one detailed, production-ready prompt for an image generation or image editing model to redesign that specific thumbnail.",
                  "Ground the prompt in visible evidence from the current thumbnail: identify the subject, composition, background, colors, text treatment, strengths, and weaknesses, then prescribe a stronger design aligned with the video's actual title.",
                  "Specify a professional 16:9 YouTube thumbnail at 1280x720, a single clear focal point, strong subject-background separation, safe margins, mandatory high contrast, and only 2-4 words of proposed on-image text.",
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
                    descriptionVariations: "3 unique descriptions, each at least 250 words",
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
                    seoScore: "1-100 based on keyword relevance, search intent, CTR potential, description quality, and completeness",
                    thumbnailScore: "1-100 using the supplied thumbnail scoring anchors",
                    thumbnailScoreReason: "Concise visual evidence supporting the score",
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

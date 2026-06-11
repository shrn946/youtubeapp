import type { SeoAnalysis, Video, VideoDraft } from "@/types/video";

const CTA_PATTERN = /\b(subscribe|watch|learn|discover|download|comment|share|visit|start|join|try)\b/i;
const LINK_PATTERN = /https?:\/\/\S+/i;
const NUMBER_PATTERN = /\d/;

function words(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function readabilityScore(value: string): number {
  const sentences = Math.max(1, (value.match(/[.!?]+/g) ?? []).length);
  const wordList = words(value);
  if (!wordList.length) return 0;
  const average = wordList.length / sentences;
  return average <= 18 ? 10 : average <= 25 ? 7 : 3;
}

export function primaryKeyword(title: string): string {
  const ignored = new Set(["the", "and", "for", "with", "how", "this", "that", "your", "you", "from"]);
  return words(title).find((word) => word.length >= 4 && !ignored.has(word)) ?? "";
}

export function analyzeSeo(title: string, description: string, sourceTitle = title): SeoAnalysis {
  const keyword = primaryKeyword(sourceTitle);
  let titleScore = 0;
  let descriptionScore = 0;
  const suggestions: string[] = [];

  if (title.length >= 50 && title.length <= 70) titleScore += 18;
  else if (title.length >= 40 && title.length <= 80) titleScore += 11;
  else {
    titleScore += 4;
    suggestions.push(title.length < 50 ? "Expand the title to 50-70 characters." : "Shorten the title to avoid truncation.");
  }
  if (keyword && title.toLowerCase().indexOf(keyword) <= 20) titleScore += 12;
  else suggestions.push("Add the primary keyword near the beginning.");
  if (NUMBER_PATTERN.test(title)) titleScore += 7;
  else suggestions.push("Consider a specific number to strengthen click-through potential.");
  titleScore += readabilityScore(title);
  if (/\b(best|easy|proven|complete|ultimate|fast|guide|mistakes|secret)\b/i.test(title)) titleScore += 3;
  else suggestions.push("Add benefit-focused wording that makes the outcome clear.");

  if (description.length >= 250) descriptionScore += 16;
  else if (description.length >= 120) descriptionScore += 10;
  else {
    descriptionScore += 3;
    suggestions.push("Write a more complete description of at least 250 characters.");
  }
  if (keyword && description.toLowerCase().includes(keyword)) descriptionScore += 10;
  else suggestions.push("Use the primary keyword naturally in the description.");
  if (CTA_PATTERN.test(description)) descriptionScore += 8;
  else suggestions.push("Add a stronger call-to-action.");
  if (LINK_PATTERN.test(description)) descriptionScore += 5;
  else suggestions.push("Add a relevant link when one is available.");
  descriptionScore += readabilityScore(description);

  return {
    score: Math.min(100, Math.round(titleScore + descriptionScore)),
    titleScore: Math.min(50, titleScore),
    descriptionScore: Math.min(50, descriptionScore),
    suggestions: [...new Set(suggestions)].slice(0, 5),
  };
}

export function generateSeoDraft(video: Video): VideoDraft {
  const keyword = primaryKeyword(video.title);
  const stripped = video.title.replace(/[|:–-]\s*.*$/, "").trim();
  const prefix = /^\d/.test(stripped) ? stripped : `7 Proven ${stripped}`;
  let title = prefix;
  if (keyword && !title.toLowerCase().startsWith(keyword)) {
    title = `${keyword[0].toUpperCase()}${keyword.slice(1)}: ${title}`;
  }
  title = title.slice(0, 70).replace(/\s+\S*$/, "");
  if (title.length < 50) title = `${title} | Complete Guide`;

  const opening = `Discover how ${stripped.toLowerCase()} can help you get better results with a clear, practical approach.`;
  const existing = video.description.trim().slice(0, 500);
  const description = [
    opening,
    existing || `In this video, we break down the key steps, common mistakes, and actionable tips you can use right away.`,
    "Watch to the end for the complete walkthrough, then subscribe for more practical guides.",
    "Share your biggest takeaway in the comments.",
  ].join("\n\n");

  return { title: title.slice(0, 70), description };
}

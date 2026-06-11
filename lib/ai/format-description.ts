import type { AiSeoInput } from "@/types/video";

interface DescriptionSeoData {
  primaryKeyword: string;
  secondaryKeywords: string[];
  relatedSearchKeywords: string[];
  tags: string[];
  hashtags: string[];
}

const SUBSCRIBE_BLOCK = [
  "Subscribe for more WordPress & Elementor Tutorials:",
  "https://www.youtube.com/@wp_design_lab",
].join("\n");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeKnownSections(value: string): string {
  return value
    .replace(/\b(?:Topics Covered|Resources?|Related Videos?|Related Searches|Focus Keywords|Tags)\s*:[\s\S]*$/i, "")
    .trim();
}

function removeUrls(value: string, urls: string[]): string {
  return urls.reduce(
    (current, url) => current.replace(new RegExp(escapeRegExp(url), "g"), ""),
    value,
  );
}

function paragraphsFrom(value: string): string[] {
  const existing = value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (existing.length > 1) return existing;

  const sentences = value
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [];

  if (sentences.length <= 2) return sentences;
  const paragraphs: string[] = [sentences[0]];
  for (let index = 1; index < sentences.length; index += 2) {
    paragraphs.push(sentences.slice(index, index + 2).join(" "));
  }
  return paragraphs;
}

export function formatAiDescription(
  description: string,
  input: AiSeoInput,
  seo?: DescriptionSeoData,
): string {
  const protectedLinks = input.protectedLinks ?? [];
  const relatedVideos = input.relatedVideos ?? [];
  const allUrls = [...protectedLinks, ...relatedVideos.map((video) => video.url)];
  const cleanBody = removeUrls(removeKnownSections(description), allUrls)
    .replace(/\bResources?\s*:/gi, "")
    .replace(/\bRelated Videos?\s*:/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const sections = paragraphsFrom(cleanBody);
  if (seo?.primaryKeyword && sections.length) {
    const first = sections[0];
    if (!first.toLowerCase().includes(seo.primaryKeyword.toLowerCase())) {
      sections[0] = `${seo.primaryKeyword}: ${first}`;
    }
  }
  if (sections.length === 1 && seo?.secondaryKeywords.length) {
    sections.push(`In this video, you will learn about ${seo.secondaryKeywords.slice(0, 3).join(", ")} through a clear, practical walkthrough.`);
  }
  const callToAction = description
    .replace(/\s+/g, " ")
    .match(/[^.!?]*(?:subscribe|like this video|leave a comment|share this video|join the channel)[^.!?]*[.!?]/i)?.[0]
    ?.trim();
  if (callToAction && !cleanBody.toLowerCase().includes(callToAction.toLowerCase())) {
    sections.push(callToAction);
  }

  if (seo?.secondaryKeywords.length) {
    sections.push([
      "Topics Covered:",
      "",
      ...seo.secondaryKeywords.slice(0, 8).map((keyword) => `- ${keyword}`),
    ].join("\n"));
  }

  if (protectedLinks.length) {
    sections.push([
      "Resources:",
      "",
      ...protectedLinks.flatMap((url) => [url, ""]),
    ].join("\n").trimEnd());
  }

  if (relatedVideos.length) {
    sections.push([
      "Related Videos:",
      "",
      ...relatedVideos.flatMap((video) => [video.title, video.url, ""]),
    ].join("\n").trimEnd());
  }

  if (seo?.relatedSearchKeywords.length) {
    sections.push([
      "Related Searches:",
      "",
      ...seo.relatedSearchKeywords.map((keyword) => `- ${keyword}`),
    ].join("\n"));
  }

  if (seo) {
    sections.push([
      "Focus Keywords:",
      "",
      seo.primaryKeyword,
      ...seo.secondaryKeywords,
    ].join("\n"));
  }

  if (seo?.tags.length) {
    sections.push(`Tags:\n\n${seo.tags.join(", ")}`);
  }

  if (seo?.hashtags.length) {
    sections.push(seo.hashtags.slice(0, 5).join(" "));
  }

  sections.push(SUBSCRIBE_BLOCK);

  return sections.join("\n\n").trim();
}

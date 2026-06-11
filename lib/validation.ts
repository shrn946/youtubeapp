import { z } from "zod";

const ALLOWED_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const CHANNEL_PATH = /^\/(?:@[\w.-]+|channel\/[\w-]+|c\/[\w.-]+|user\/[\w.-]+)(?:\/(?:videos)?)?\/?$/i;

export function normalizeYouTubeUrl(input: string): string {
  const trimmed = input.trim();
  const candidate = trimmed.startsWith("@")
    ? `https://www.youtube.com/${trimmed}/videos`
    : /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid YouTube channel URL or @handle.");
  }

  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Only secure youtube.com channel URLs are allowed.");
  }
  if (!CHANNEL_PATH.test(url.pathname)) {
    throw new Error("Use a channel, handle, user, custom channel, or channel videos URL.");
  }

  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/$/, "");
  if (!url.pathname.endsWith("/videos")) url.pathname = `${url.pathname}/videos`;
  return url.toString();
}

export const extractRequestSchema = z.object({
  url: z.string().trim().min(2).max(500),
  offset: z.number().int().min(0).max(10000).default(0),
  limit: z.number().int().min(1).max(50).default(50),
});

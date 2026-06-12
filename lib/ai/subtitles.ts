import "server-only";
import { z } from "zod";

export const subtitleRequestSchema = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().trim().min(1).max(500),
  description: z.string().max(20_000),
  videoUrl: z.string().url().max(1000),
  duration: z.number().int().min(0).max(86_400).optional().default(0),
  language: z.enum(["en", "es", "de", "fr", "pt", "id"]).optional().default("en"),
  refresh: z.boolean().optional().default(false),
});

const TIMESTAMP = /^(\d{2}):([0-5]\d):([0-5]\d),(\d{3})$/;

function timestampMs(value: string): number | null {
  const match = value.match(TIMESTAMP);
  if (!match) return null;
  return (((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000) + Number(match[4]);
}

function formatTimestamp(value: number): string {
  const hours = Math.floor(value / 3_600_000);
  const minutes = Math.floor((value % 3_600_000) / 60_000);
  const seconds = Math.floor((value % 60_000) / 1000);
  const milliseconds = value % 1000;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":") + `,${String(milliseconds).padStart(3, "0")}`;
}

function wrapText(value: string): string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > 42) return [];
    const next = current ? `${current} ${word}` : word;
    if (next.length <= 42) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function normalizeAndValidateSrt(raw: string): string {
  const cleaned = raw
    .replace(/^\uFEFF/, "")
    .replace(/^```(?:srt)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  const blocks = cleaned.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (!blocks.length) throw new Error("AI returned an empty subtitle file.");

  const parsedCues: Array<{ start: number; end: number; lines: string[] }> = [];
  blocks.forEach((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timestampIndex = lines.findIndex((line) => line.includes("-->"));
    if (timestampIndex < 0) throw new Error(`Subtitle ${index + 1} has no timestamp.`);
    const [startText, endText] = lines[timestampIndex].split("-->").map((value) => value.trim());
    const start = timestampMs(startText);
    const end = timestampMs(endText);
    if (start === null || end === null || end <= start) {
      throw new Error(`Subtitle ${index + 1} has invalid timestamps.`);
    }
    const wrapped = wrapText(lines.slice(timestampIndex + 1).join(" "));
    if (!wrapped.length) {
      throw new Error(`Subtitle ${index + 1} contains invalid text.`);
    }
    parsedCues.push({ start, end, lines: wrapped });
  });

  parsedCues.sort((a, b) => a.start - b.start || a.end - b.end);

  let previousEnd = -1;
  const cues: Array<{ start: number; end: number; lines: string[] }> = [];
  parsedCues.forEach((cue, index) => {
    const start = Math.max(cue.start, previousEnd);
    let end = cue.end;
    if (end <= start) {
      const nextStart = parsedCues[index + 1]?.start;
      end = nextStart && nextStart > start ? nextStart : start + 1000;
    }

    const chunks = Array.from({ length: Math.ceil(cue.lines.length / 2) }, (_, chunkIndex) => (
      cue.lines.slice(chunkIndex * 2, chunkIndex * 2 + 2)
    ));
    const duration = end - start;
    if (duration < chunks.length) end = start + chunks.length;
    chunks.forEach((chunk, chunkIndex) => {
      const adjustedDuration = end - start;
      const chunkStart = start + Math.floor((adjustedDuration * chunkIndex) / chunks.length);
      const chunkEnd = start + Math.floor((adjustedDuration * (chunkIndex + 1)) / chunks.length);
      cues.push({ start: chunkStart, end: chunkEnd, lines: chunk });
    });
    previousEnd = end;
  });

  return `${cues.map((cue, index) => (
    `${index + 1}\n${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}\n${cue.lines.join("\n")}`
  )).join("\n\n")}\n`;
}

export function srtEndTimeMs(srt: string): number {
  const timestamps = [...srt.matchAll(/-->\s*(\d{2}:[0-5]\d:[0-5]\d,\d{3})/g)];
  const end = timestamps.length ? timestampMs(timestamps[timestamps.length - 1][1]) : null;
  return end ?? 0;
}

export function subtitleFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `${slug || "youtube-subtitles"}.srt`;
}

import "server-only";
import { spawn } from "node:child_process";
import path from "node:path";
import { normalizeAndValidateSrt, srtEndTimeMs } from "@/lib/ai/subtitles";

interface TranscriptSegment {
  startMs: number;
  durationMs: number;
  text: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

export interface SubtitleGenerationInput {
  videoId: string;
  title: string;
  description: string;
  duration: number;
  language: string;
}

export interface GeneratedSubtitles {
  srt: string;
  source: "transcript" | "metadata";
  provider: string;
}

function fetchTranscript(videoId: string, language: string): Promise<TranscriptSegment[]> {
  return new Promise((resolve) => {
    const script = path.join(process.cwd(), "scripts", "youtube-transcript-extractor.py");
    const python = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
    const child = spawn(python, [script, videoId, language], {
      cwd: process.cwd(),
      windowsHide: true,
      shell: false,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    child.stdin.end();
    let stdout = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), 45_000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout = (stdout + chunk).slice(-8 * 1024 * 1024);
    });
    child.on("error", () => resolve([]));
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return resolve([]);
      try {
        const parsed = JSON.parse(stdout) as { segments?: TranscriptSegment[] };
        resolve(parsed.segments?.filter((item) => item.text && item.durationMs >= 0).slice(0, 12_000) ?? []);
      } catch {
        resolve([]);
      }
    });
  });
}

function limitTranscript(segments: TranscriptSegment[]): TranscriptSegment[] {
  const included: TranscriptSegment[] = [];
  let output = "";
  for (const segment of segments) {
    const line = `[${segment.startMs}-${segment.startMs + segment.durationMs}ms] ${segment.text}\n`;
    if (output.length + line.length > 300_000) break;
    output += line;
    included.push(segment);
  }
  return included;
}

function transcriptText(segments: TranscriptSegment[]): string {
  return segments.map((segment) => (
    `[${segment.startMs}-${segment.startMs + segment.durationMs}ms] ${segment.text}`
  )).join("\n");
}

function formatTimestamp(value: number): string {
  const hours = Math.floor(value / 3_600_000);
  const minutes = Math.floor((value % 3_600_000) / 60_000);
  const seconds = Math.floor((value % 60_000) / 1000);
  const milliseconds = value % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
}

function segmentsToSrt(segments: TranscriptSegment[]): string {
  return segments.map((segment, index) => {
    const end = segment.startMs + Math.max(segment.durationMs, 1000);
    return `${index + 1}\n${formatTimestamp(segment.startMs)} --> ${formatTimestamp(end)}\n${segment.text}`;
  }).join("\n\n");
}

function transcriptChunks(segments: TranscriptSegment[]): TranscriptSegment[][] {
  const chunks: TranscriptSegment[][] = [];
  let current: TranscriptSegment[] = [];
  let characters = 0;
  let chunkStart = 0;

  for (const segment of segments) {
    const lineLength = segment.text.length + 40;
    const elapsed = current.length ? segment.startMs - chunkStart : 0;
    if (current.length && (current.length >= 80 || characters + lineLength > 18_000 || elapsed > 8 * 60 * 1000)) {
      chunks.push(current);
      current = [];
      characters = 0;
    }
    if (!current.length) chunkStart = segment.startMs;
    current.push(segment);
    characters += lineLength;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function requestSrt(
  apiKey: string,
  model: string,
  input: SubtitleGenerationInput,
  segments: TranscriptSegment[],
  signal: AbortSignal,
): Promise<string> {
  const hasTranscript = segments.length > 0;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: [
              "You are an expert subtitle generator.",
              "Return only a valid YouTube-compatible SRT file with no Markdown fences or commentary.",
              "Use sequential numbering from 1 and HH:MM:SS,mmm timestamps.",
              "Every subtitle must start at or after the previous subtitle ends. Never create overlapping or reversed timestamps.",
              "Use at most 2 lines per subtitle and at most 42 characters per line.",
              "Correct grammar and punctuation, remove filler words, preserve meaning, and preserve technical terms.",
              "Keep Elementor, WordPress, WooCommerce, ACF, Contact Form 7, plugin names, and technical terminology accurate.",
              hasTranscript
                ? "Use every supplied timed transcript segment as the source of truth. Preserve the absolute millisecond timing range and do not omit the final segment or invent speech."
                : "No transcript is available. Create a clearly structured subtitle draft from the supplied metadata, distributed across the stated duration. Do not claim it is a verbatim transcript.",
            ].join(" "),
          }],
        },
        contents: [{
          role: "user",
          parts: [{
            text: [
              `Video Title:\n${input.title}`,
              `Video Description:\n${input.description || "No description provided."}`,
              `Video Duration Seconds:\n${input.duration}`,
              `Video Transcript:\n${hasTranscript ? transcriptText(segments) : "Not available."}`,
              hasTranscript
                ? "Generate SRT for this transcript chunk only. Keep the supplied absolute timestamps."
                : "Generate complete SRT subtitles.",
            ].join("\n\n"),
          }],
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: hasTranscript ? 16_384 : 32_768,
          responseMimeType: "text/plain",
        },
      }),
    },
  );
  const payload = await response.json() as GeminiResponse;
  if (!response.ok) throw new Error(payload.error?.message || `Gemini request failed (${response.status}).`);
  const raw = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
  if (!raw) throw new Error("Gemini returned an empty subtitle file.");
  return normalizeAndValidateSrt(raw);
}

export async function generateSubtitles(input: SubtitleGenerationInput): Promise<GeneratedSubtitles> {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  if (provider !== "gemini") throw new Error("Subtitle generation currently requires the Gemini provider.");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const segments = limitTranscript(await fetchTranscript(input.videoId, input.language));
  const source = segments.length ? "transcript" as const : "metadata" as const;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60_000);

  try {
    const chunks = segments.length ? transcriptChunks(segments) : [[]];
    const generatedChunks: string[] = [];
    for (const chunk of chunks) {
      const srtChunk = await requestSrt(apiKey, model, input, chunk, controller.signal);
      generatedChunks.push(srtChunk);
    }
    let srt = normalizeAndValidateSrt(generatedChunks.join("\n"));
    if (segments.length) {
      const finalSegment = segments[segments.length - 1];
      const expectedEnd = finalSegment.startMs + finalSegment.durationMs;
      const generatedEnd = srtEndTimeMs(srt);
      if (generatedEnd < expectedEnd - 5000) {
        const missingTail = segments.filter((segment) => segment.startMs >= generatedEnd);
        if (missingTail.length) {
          srt = normalizeAndValidateSrt(`${srt}\n${segmentsToSrt(missingTail)}`);
        }
      }
    }
    return { srt, source, provider: "gemini" };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Subtitle generation timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

import type { AiSeoResult, SeoAnalysis, Video, VideoDraft } from "@/types/video";
import { formatDuration } from "@/lib/utils";

export interface ExportRow {
  "Video Title": string;
  "Video URL": string;
  "Current Description": string;
  "New SEO Title": string;
  "New SEO Description": string;
  "Upload Date": string;
  Duration: string;
  Views: number;
  "SEO Score": number;
}

export function makeExportRows(
  videos: Video[],
  drafts: Record<string, VideoDraft>,
  analyze: (title: string, description: string, sourceTitle?: string) => SeoAnalysis,
): ExportRow[] {
  return videos.map((video) => {
    const draft = drafts[video.id] ?? { title: video.title, description: video.description };
    return {
      "Video Title": video.title,
      "Video URL": video.url,
      "Current Description": video.description,
      "New SEO Title": draft.title,
      "New SEO Description": draft.description,
      "Upload Date": video.uploadDate ?? "",
      Duration: formatDuration(video.duration),
      Views: video.views,
      "SEO Score": analyze(draft.title, draft.description, video.title).score,
    };
  });
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsv(rows: ExportRow[]) {
  const headers = Object.keys(rows[0] ?? {}) as (keyof ExportRow)[];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => headers.map((key) => escape(row[key])).join(","))].join("\r\n");
  download(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }), "youtube-seo-data.csv");
}

export async function exportExcel(rows: ExportRow[]) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 45 }, { wch: 42 }, { wch: 70 }, { wch: 45 }, { wch: 70 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "YouTube SEO");
  XLSX.writeFile(workbook, "youtube-seo-data.xlsx", { compression: true });
}

export interface AiExportRow {
  "Video Title": string;
  "Video URL": string;
  "Current Description": string;
  "SEO Title": string;
  "SEO Description": string;
  "Primary Keyword": string;
  "Secondary Keywords": string;
  "Related Searches": string;
  Tags: string;
  Keywords: string;
  Hashtags: string;
  "Related Videos": string;
  "Pinned Comment": string;
  Chapters: string;
  "Thumbnail Redesign Prompt": string;
  "Upload Date": string;
  Duration: string;
  Views: number;
  "SEO Score": number;
}

export function makeAiExportRows(
  videos: Video[],
  drafts: Record<string, VideoDraft>,
  aiResults: Record<string, AiSeoResult>,
): AiExportRow[] {
  return videos.map((video) => {
    const ai = aiResults[video.id];
    const draft = drafts[video.id];
    return {
      "Video Title": video.title,
      "Video URL": video.url,
      "Current Description": video.description,
      "SEO Title": draft?.title || ai?.seoTitle || "",
      "SEO Description": draft?.description || ai?.seoDescription || "",
      "Primary Keyword": ai?.primaryKeyword || "",
      "Secondary Keywords": ai?.secondaryKeywords.join(", ") || "",
      "Related Searches": ai?.relatedSearchKeywords.join(" | ") || "",
      Tags: ai?.tags.join(", ") || "",
      Keywords: ai?.keywords.join(", ") || "",
      Hashtags: ai?.hashtags.join(" ") || "",
      "Related Videos": ai?.relatedVideoSuggestions.map((item) => `${item.title}: ${item.url}`).join("\n") || "",
      "Pinned Comment": ai?.pinnedComment || "",
      Chapters: ai?.chapters.map((chapter) => `${chapter.timestamp} ${chapter.title}`).join("\n") || "",
      "Thumbnail Redesign Prompt": ai?.thumbnailRedesignPrompt || "",
      "Upload Date": video.uploadDate ?? "",
      Duration: formatDuration(video.duration),
      Views: video.views,
      "SEO Score": ai?.seoScore ?? 0,
    };
  });
}

export function exportAiCsv(rows: AiExportRow[]) {
  const headers = Object.keys(rows[0] ?? {}) as (keyof AiExportRow)[];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => headers.map((key) => escape(row[key])).join(","))].join("\r\n");
  download(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }), "youtube-seo-ai-export.csv");
}

export async function exportAiExcel(rows: AiExportRow[]) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 45 }, { wch: 42 }, { wch: 70 }, { wch: 45 }, { wch: 70 },
    { wch: 28 }, { wch: 55 }, { wch: 70 }, { wch: 55 }, { wch: 55 },
    { wch: 35 }, { wch: 70 }, { wch: 70 }, { wch: 45 }, { wch: 90 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "YouTube AI SEO");
  XLSX.writeFile(workbook, "youtube-seo-ai-export.xlsx", { compression: true });
}

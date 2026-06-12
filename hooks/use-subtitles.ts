"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { SubtitleResult, Video } from "@/types/video";

function downloadSrt(result: SubtitleResult) {
  const blob = new Blob([result.srt], { type: "application/x-subrip;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function useSubtitles() {
  const [results, setResults] = useState<Record<string, SubtitleResult>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [activeResult, setActiveResult] = useState<SubtitleResult | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const generate = useCallback(async (video: Video, refresh = false) => {
    setActiveVideo(video);
    setActiveResult(results[video.id] ?? null);
    setOpen(true);
    setError("");
    setLoadingIds((current) => new Set(current).add(video.id));
    try {
      const response = await fetch("/api/ai/subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          title: video.title,
          description: video.description,
          videoUrl: video.url,
          duration: video.duration,
          language: "en",
          refresh,
        }),
      });
      const data = await response.json() as { result?: SubtitleResult; cached?: boolean; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error || "Subtitle generation failed.");
      setResults((current) => ({ ...current, [video.id]: data.result! }));
      setActiveResult(data.result);
      downloadSrt(data.result);
      toast.success(data.cached ? "Saved subtitles downloaded." : "Subtitle generated successfully.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Subtitle generation failed.";
      setError(message);
      setActiveResult(results[video.id] ?? null);
      toast.error(message);
    } finally {
      setLoadingIds((current) => {
        const next = new Set(current);
        next.delete(video.id);
        return next;
      });
    }
  }, [results]);

  const close = useCallback(() => {
    setOpen(false);
    setError("");
  }, []);

  const preview = useCallback((video: Video) => {
    const result = results[video.id];
    if (!result) return;
    setActiveVideo(video);
    setActiveResult(result);
    setError("");
    setOpen(true);
  }, [results]);

  return {
    results,
    loadingIds,
    activeVideo,
    activeResult,
    error,
    open,
    generate,
    preview,
    close,
    download: downloadSrt,
  };
}

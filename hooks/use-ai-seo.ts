"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { loadAiResults, saveAiResult } from "@/lib/ai/local-store";
import type { AiSeoResult, Video } from "@/types/video";

const CONCURRENCY = 2;

type ItemStatus = "idle" | "loading" | "success" | "error";

interface BulkProgress {
  active: boolean;
  completed: number;
  total: number;
  failed: number;
}

const ignoredWords = new Set([
  "this", "that", "with", "from", "your", "you", "the", "and", "for", "how",
  "create", "using", "video", "tutorial", "elementor", "wordpress",
]);

function relatedVideosFor(video: Video, catalog: Video[]): Array<{ title: string; url: string }> {
  const sourceWords = new Set(
    (video.title.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      .filter((word) => word.length > 2 && !ignoredWords.has(word)),
  );
  return catalog
    .filter((candidate) => candidate.id !== video.id)
    .map((candidate) => {
      const candidateWords = candidate.title.toLowerCase().match(/[a-z0-9]+/g) ?? [];
      const score = candidateWords.reduce((total, word) => total + (sourceWords.has(word) ? 1 : 0), 0);
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score || b.candidate.views - a.candidate.views)
    .slice(0, 5)
    .map(({ candidate }) => ({ title: candidate.title, url: candidate.url }));
}

function protectedLinksFrom(description: string): string[] {
  const links = description.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
  return [...new Set(links.map((link) => link.replace(/[.,;:!?]+$/, "")))].slice(0, 50);
}

async function requestSeo(video: Video, catalog: Video[]): Promise<AiSeoResult> {
  const response = await fetch("/api/ai/seo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: video.title,
      description: video.description.slice(0, 12_000),
      channelName: video.channelName,
      videoUrl: video.url,
      thumbnailUrl: video.thumbnail,
      duration: video.duration,
      relatedVideos: relatedVideosFor(video, catalog),
      protectedLinks: protectedLinksFrom(video.description),
    }),
  });
  const data = await response.json() as { result?: AiSeoResult; error?: string };
  if (!response.ok || !data.result) throw new Error(data.error || "AI generation failed.");
  return data.result;
}

export function useAiSeo(catalog: Video[]) {
  const [results, setResults] = useState<Record<string, AiSeoResult>>({});
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<BulkProgress>({ active: false, completed: 0, total: 0, failed: 0 });
  const failedVideos = useRef<Map<string, Video>>(new Map());

  useEffect(() => {
    loadAiResults().then(setResults).catch(() => {
      toast.error("Saved AI results could not be loaded.");
    });
  }, []);

  const generate = useCallback(async (video: Video, silent = false) => {
    setStatuses((current) => ({ ...current, [video.id]: "loading" }));
    setErrors((current) => {
      const next = { ...current };
      delete next[video.id];
      return next;
    });
    try {
      let result: AiSeoResult;
      try {
        result = await requestSeo(video, catalog);
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        result = await requestSeo(video, catalog);
      }
      setResults((current) => ({ ...current, [video.id]: result }));
      void saveAiResult(video.id, result).catch(() => {
        if (!silent) toast.error("AI result saved in this browser, but SQLite is unavailable.");
      });
      setStatuses((current) => ({ ...current, [video.id]: "success" }));
      failedVideos.current.delete(video.id);
      if (!silent) toast.success("AI SEO package generated.");
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI generation failed.";
      setStatuses((current) => ({ ...current, [video.id]: "error" }));
      setErrors((current) => ({ ...current, [video.id]: message }));
      failedVideos.current.set(video.id, video);
      if (!silent) toast.error(message);
      return null;
    }
  }, [catalog]);

  const generateBulk = useCallback(async (videos: Video[]) => {
    if (!videos.length || progress.active) return;
    const unique = [...new Map(videos.map((video) => [video.id, video])).values()];
    failedVideos.current.clear();
    setProgress({ active: true, completed: 0, total: unique.length, failed: 0 });

    let cursor = 0;
    let failed = 0;
    async function worker() {
      while (cursor < unique.length) {
        const index = cursor++;
        const result = await generate(unique[index], true);
        if (!result) failed += 1;
        setProgress((current) => ({
          ...current,
          completed: current.completed + 1,
          failed,
        }));
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker));
    setProgress((current) => ({ ...current, active: false, failed }));
    failed
      ? toast.error(`AI processing finished with ${failed} failed video${failed === 1 ? "" : "s"}.`)
      : toast.success(`AI SEO generated for ${unique.length} videos.`);
  }, [generate, progress.active]);

  const retryFailed = useCallback(() => {
    void generateBulk([...failedVideos.current.values()]);
  }, [generateBulk]);

  const retryVideo = useCallback((video: Video) => {
    void generate(video);
  }, [generate]);

  return {
    results,
    statuses,
    errors,
    progress,
    generate,
    generateBulk,
    retryFailed,
    retryVideo,
  };
}

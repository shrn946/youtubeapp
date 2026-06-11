"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace-store";
import type { ExtractResponse, SortDirection, SortKey, Video, VideoDraft } from "@/types/video";

const PAGE_SIZE = 100;
const EXTRACTION_BATCH_SIZE = 50;

export function useVideoWorkspace() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [drafts, setDrafts] = useState<Record<string, VideoDraft>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("uploadDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const restored = useRef(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    loadWorkspace()
      .then((saved) => {
        if (!saved) return;
        setVideos(saved.videos);
        setDrafts(saved.drafts);
        setSelected(new Set(saved.selectedIds));
        setActiveId(saved.activeId);
        setSourceUrl(saved.sourceUrl);
        setTotalAvailable(saved.totalAvailable);
        setNextOffset(saved.nextOffset);
        setHasMore(saved.hasMore);
      })
      .catch(() => toast.error("The previous video workspace could not be restored."))
      .finally(() => {
        restored.current = true;
      });
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    const timer = window.setTimeout(() => {
      void saveWorkspace({
        videos,
        drafts,
        selectedIds: [...selected],
        activeId,
        sourceUrl,
        totalAvailable,
        nextOffset,
        hasMore,
      }).catch(() => toast.error("Workspace saved in this browser, but SQLite is unavailable."));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [activeId, drafts, hasMore, nextOffset, selected, sourceUrl, totalAvailable, videos]);

  const extract = useCallback(async (url: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, offset: 0, limit: EXTRACTION_BATCH_SIZE }),
      });
      const data = (await response.json()) as ExtractResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Extraction failed.");
      setVideos(data.videos);
      setDrafts({});
      setSelected(new Set());
      setActiveId(data.videos[0]?.id ?? null);
      setSourceUrl(url);
      setTotalAvailable(data.total);
      setNextOffset(data.nextOffset);
      setHasMore(data.hasMore);
      setPage(1);
      toast.success(`${data.videos.length} videos loaded${data.cached ? " (cached)" : ""}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to extract channel videos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!sourceUrl || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sourceUrl,
          offset: nextOffset,
          limit: EXTRACTION_BATCH_SIZE,
        }),
      });
      const data = (await response.json()) as ExtractResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Extraction failed.");

      const known = new Set(videos.map((video) => video.id));
      const incoming = data.videos.filter((video) => !known.has(video.id));
      setVideos((current) => [...current, ...incoming]);
      setTotalAvailable((current) => Math.max(current, data.total));
      setNextOffset(data.nextOffset);
      setHasMore(data.hasMore && data.nextOffset > nextOffset);
      toast.success(`${incoming.length} more videos loaded${data.cached ? " (cached)" : ""}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load more videos.");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextOffset, sourceUrl, videos]);

  const filtered = useMemo(() => {
    const result = deferredQuery
      ? videos.filter((video) =>
          `${video.title} ${video.description} ${video.channelName}`.toLowerCase().includes(deferredQuery),
        )
      : [...videos];
    result.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "views") return (a.views - b.views) * direction;
      return (String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""))) * direction;
    });
    return result;
  }, [deferredQuery, sortDirection, sortKey, videos]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeVideo = videos.find((video) => video.id === activeId) ?? null;

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Set(current);
      const allSelected = paged.every((video) => next.has(video.id));
      paged.forEach((video) => allSelected ? next.delete(video.id) : next.add(video.id));
      return next;
    });
  }

  function updateDraft(id: string, draft: VideoDraft) {
    setDrafts((current) => ({ ...current, [id]: draft }));
  }

  function changeSort(key: SortKey) {
    if (key === sortKey) setSortDirection((value) => value === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDirection(key === "title" ? "asc" : "desc");
    }
    setPage(1);
  }

  return {
    videos, drafts, selected, activeVideo, activeId, loading, loadingMore, sourceUrl,
    totalAvailable, hasMore, query, sortKey, sortDirection,
    page, pageCount, paged, filtered, setQuery: (value: string) => { setQuery(value); setPage(1); },
    setPage, setActiveId, extract, loadMore, toggleSelected, togglePage, updateDraft, changeSort,
  };
}

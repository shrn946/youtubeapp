"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace-store";
import { analyzeSeo } from "@/lib/seo";
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
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [thumbnailVersions, setThumbnailVersions] = useState<Record<string, number>>({});
  const [sourceUrl, setSourceUrl] = useState("");
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState("");
  const [editedOnly, setEditedOnly] = useState(false);
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

  const refreshVideos = useCallback(async () => {
    if (!sourceUrl || !videos.length || refreshing) return;
    setRefreshing(true);
    try {
      const refreshed: Video[] = [];
      let latestTotal = 0;
      let latestNextOffset = 0;
      let latestHasMore = false;
      const batchCount = Math.max(1, Math.ceil(videos.length / EXTRACTION_BATCH_SIZE));

      for (let batch = 0; batch < batchCount; batch += 1) {
        const offset = batch * EXTRACTION_BATCH_SIZE;
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: sourceUrl,
            offset,
            limit: EXTRACTION_BATCH_SIZE,
            refresh: true,
          }),
        });
        const data = (await response.json()) as ExtractResponse & { error?: string };
        if (!response.ok) throw new Error(data.error || "Refresh failed.");
        refreshed.push(...data.videos);
        latestTotal = Math.max(latestTotal, data.total);
        latestNextOffset = data.nextOffset;
        latestHasMore = data.hasMore;
        if (!data.hasMore) break;
      }

      const unique = [...new Map(refreshed.map((video) => [video.id, video])).values()];
      setVideos(unique);
      const refreshVersion = Date.now();
      setThumbnailVersions(Object.fromEntries(unique.map((video) => [video.id, refreshVersion])));
      setTotalAvailable(latestTotal);
      setNextOffset(latestNextOffset);
      setHasMore(latestHasMore);
      setSelected((current) => new Set([...current].filter((id) => unique.some((video) => video.id === id))));
      setActiveId((current) => current && unique.some((video) => video.id === current) ? current : unique[0]?.id ?? null);
      toast.success(`${unique.length} video records refreshed.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to refresh video records.");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, sourceUrl, videos]);

  const refreshVideo = useCallback(async (video: Video) => {
    if (refreshingIds.has(video.id)) return;
    setRefreshingIds((current) => new Set(current).add(video.id));
    try {
      const response = await fetch("/api/extract/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id }),
      });
      const data = (await response.json()) as { video?: Video; error?: string };
      if (!response.ok || !data.video) throw new Error(data.error || "Video refresh failed.");
      setVideos((current) => current.map((item) => item.id === video.id ? data.video! : item));
      setThumbnailVersions((current) => ({ ...current, [video.id]: Date.now() }));
      toast.success("Video record refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to refresh this video.");
    } finally {
      setRefreshingIds((current) => {
        const next = new Set(current);
        next.delete(video.id);
        return next;
      });
    }
  }, [refreshingIds]);

  const editedIds = useMemo(() => new Set(
    videos
      .filter((video) => {
        const draft = drafts[video.id];
        return draft && (draft.title !== video.title || draft.description !== video.description);
      })
      .map((video) => video.id),
  ), [drafts, videos]);

  const filtered = useMemo(() => {
    const result = videos.filter((video) => {
      if (editedOnly && !editedIds.has(video.id)) return false;
      if (!deferredQuery) return true;
      const draft = drafts[video.id];
      return `${video.title} ${video.description} ${video.channelName} ${draft?.title ?? ""} ${draft?.description ?? ""}`
        .toLowerCase()
        .includes(deferredQuery);
    });
    result.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "views") return (a.views - b.views) * direction;
      if (sortKey === "seoScore") {
        return (analyzeSeo(a.title, a.description).score - analyzeSeo(b.title, b.description).score) * direction;
      }
      return (String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""))) * direction;
    });
    return result;
  }, [deferredQuery, drafts, editedIds, editedOnly, sortDirection, sortKey, videos]);

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
    videos, drafts, selected, editedIds, editedOnly, activeVideo, activeId, loading, loadingMore, refreshing, refreshingIds, thumbnailVersions, sourceUrl,
    totalAvailable, hasMore, query, sortKey, sortDirection,
    page, pageCount, paged, filtered, setQuery: (value: string) => { setQuery(value); setPage(1); },
    setEditedOnly: (value: boolean) => { setEditedOnly(value); setPage(1); },
    setPage, setActiveId, extract, loadMore, refreshVideos, refreshVideo, toggleSelected, togglePage, updateDraft, changeSort,
  };
}

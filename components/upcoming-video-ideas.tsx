"use client";

import { useState } from "react";
import { Clipboard, ExternalLink, Lightbulb, LoaderCircle, PlaySquare, RefreshCw, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UpcomingIdeasResult } from "@/lib/ai/upcoming-ideas";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { Video } from "@/types/video";

interface RelatedVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  uploadDate: string | null;
  views: number;
  channelName: string;
  summary: string;
}

function copy(value: string, label: string) {
  navigator.clipboard.writeText(value)
    .then(() => toast.success(`${label} copied.`))
    .catch(() => toast.error("Clipboard access was denied."));
}

function potentialClass(value: "High" | "Medium" | "Emerging"): string {
  if (value === "High") return "bg-emerald-500/15 text-emerald-600";
  if (value === "Medium") return "bg-amber-500/15 text-amber-600";
  return "bg-sky-500/15 text-sky-600";
}

export function UpcomingVideoIdeas({ videos, activeVideo }: { videos: Video[]; activeVideo: Video | null }) {
  const [tab, setTab] = useState<"ideas" | "related">("ideas");
  const [result, setResult] = useState<UpcomingIdeasResult | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState("");
  const [related, setRelated] = useState<RelatedVideo[]>([]);
  const [relatedQuery, setRelatedQuery] = useState("");
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");

  async function generateIdeas(refresh = false) {
    if (!videos.length || ideasLoading) return;
    setIdeasLoading(true);
    setIdeasError("");
    try {
      const response = await fetch("/api/ai/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName: videos[0]?.channelName || "",
          videos: videos.map((video) => ({
            title: video.title,
            uploadDate: video.uploadDate,
            views: video.views,
          })),
          refresh,
        }),
      });
      const data = await response.json() as { result?: UpcomingIdeasResult; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error || "Idea generation failed.");
      setResult(data.result);
      toast.success(`${data.result.ideas.length} upcoming video ideas generated.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Idea generation failed.";
      setIdeasError(message);
      toast.error(message);
    } finally {
      setIdeasLoading(false);
    }
  }

  async function findRelated() {
    if (!videos.length || relatedLoading) return;
    const fallback = [...videos].sort((a, b) => b.views - a.views)[0]?.title || videos[0].channelName;
    const query = activeVideo?.title || result?.niche || fallback;
    setRelatedLoading(true);
    setRelatedError("");
    try {
      const response = await fetch("/api/related-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          currentChannel: videos[0]?.channelName || "",
          excludedIds: videos.map((video) => video.id),
        }),
      });
      const data = await response.json() as { videos?: RelatedVideo[]; query?: string; error?: string };
      if (!response.ok || !data.videos) throw new Error(data.error || "Related video search failed.");
      setRelated(data.videos);
      setRelatedQuery(data.query || query);
      toast.success(`${data.videos.length} related channel videos found.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Related video search failed.";
      setRelatedError(message);
      toast.error(message);
    } finally {
      setRelatedLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-2 border-b bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setTab("ideas")}
          className={cn(
            "focus-ring flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition",
            tab === "ideas" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Lightbulb className="size-4" /> Upcoming Video Ideas
        </button>
        <button
          type="button"
          onClick={() => setTab("related")}
          className={cn(
            "focus-ring flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition",
            tab === "related" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <PlaySquare className="size-4" /> Related Channel Videos
        </button>
      </div>

      {tab === "ideas" ? (
        <>
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold">Upcoming Video Ideas</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Gap-aware ideas from loaded titles, relative views, and publishing history. Demand estimates are AI-informed.
              </p>
            </div>
            <Button onClick={() => void generateIdeas(Boolean(result))} disabled={ideasLoading || !videos.length}>
              {ideasLoading
                ? <LoaderCircle className="size-4 animate-spin" />
                : result
                  ? <RefreshCw className="size-4" />
                  : <Sparkles className="size-4" />}
              {ideasLoading ? "Generating ideas..." : result ? "Regenerate Ideas" : "Generate Ideas"}
            </Button>
          </div>

          {ideasError ? <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">{ideasError}</div> : null}
          {ideasLoading && !result ? (
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : null}

          {result ? (
            <div className="p-4">
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Detected channel niche</p>
                <p className="mt-1 text-sm font-semibold">{result.niche}</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {result.ideas.map((idea, index) => (
                  <article key={`${index}-${idea.title}`} className="rounded-xl border p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Idea {index + 1}</p>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", potentialClass(idea.searchPotential))}>
                            {idea.searchPotential} search potential
                          </span>
                        </div>
                        <h3 className="mt-1 text-base font-bold leading-snug">{idea.title}</h3>
                      </div>
                      <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label="Copy video title" onClick={() => copy(idea.title, "Video title")}>
                        <Clipboard className="size-3.5" />
                      </Button>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold">SEO-Friendly Description</p>
                        <Button size="sm" variant="ghost" onClick={() => copy(idea.description, "Description")}><Clipboard className="size-3.5" /> Copy</Button>
                      </div>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{idea.description}</p>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-bold">Reason for Recommendation</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{idea.reason}</p>
                    </div>
                    <div className="mt-3 rounded-lg border border-dashed p-3">
                      <p className="text-xs font-bold">Content Gap Opportunity</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{idea.contentGap}</p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="mt-4 text-center text-[10px] text-muted-foreground">
                Generated with {result.provider} · {new Date(result.generatedAt).toLocaleString()}
              </p>
            </div>
          ) : !ideasLoading ? (
            <div className="p-8 text-center">
              <Lightbulb className="mx-auto size-8 text-amber-500" />
              <p className="mt-3 text-sm font-semibold">Generate a gap-aware content plan from your current library.</p>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold">Related Channel Videos</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Real YouTube results based on {activeVideo ? `the selected video: ${activeVideo.title}` : "your top-performing channel topic"}.
              </p>
            </div>
            <Button onClick={() => void findRelated()} disabled={relatedLoading || !videos.length}>
              {relatedLoading
                ? <LoaderCircle className="size-4 animate-spin" />
                : related.length
                  ? <RefreshCw className="size-4" />
                  : <Search className="size-4" />}
              {relatedLoading ? "Searching YouTube..." : related.length ? "Refresh Results" : "Find Related Videos"}
            </Button>
          </div>

          {relatedError ? <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">{relatedError}</div> : null}
          {relatedLoading && !related.length ? (
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : null}

          {related.length ? (
            <div className="p-4">
              <p className="mb-3 text-xs text-muted-foreground">Search context: <span className="font-semibold text-foreground">{relatedQuery}</span></p>
              <div className="grid gap-4 xl:grid-cols-2">
                {related.map((video) => (
                  <article key={video.id} className="overflow-hidden rounded-xl border">
                    <a href={video.url} target="_blank" rel="noreferrer" className="block aspect-video bg-muted">
                      {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                    </a>
                    <div className="p-4">
                      <h3 className="font-bold leading-snug">{video.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-primary">{video.channelName || "Unknown channel"}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatNumber(video.views)} views</span>
                        <span>{formatDate(video.uploadDate)}</span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{video.summary}</p>
                      <a href={video.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        Open video <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : !relatedLoading ? (
            <div className="p-8 text-center">
              <PlaySquare className="mx-auto size-8 text-primary" />
              <p className="mt-3 text-sm font-semibold">Select a library video, then find relevant top-performing videos.</p>
              <p className="mx-auto mt-1 max-w-xl text-xs text-muted-foreground">Your own channel videos are excluded from these results.</p>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Lightbulb, ListVideo, LoaderCircle, PlaySquare, Plus, RefreshCw, Search, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { OptimizationPanel } from "@/components/optimization-panel";
import { Statistics } from "@/components/statistics";
import { ThemeToggle } from "@/components/theme-toggle";
import { UpcomingVideoIdeas } from "@/components/upcoming-video-ideas";
import { ContentTopicPlanner } from "@/components/content-topic-planner";
import { SubtitleModal } from "@/components/subtitle-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VideoTable } from "@/components/video-table";
import { useVideoWorkspace } from "@/hooks/use-video-workspace";
import { useAiSeo } from "@/hooks/use-ai-seo";
import { useSubtitles } from "@/hooks/use-subtitles";
import { analyzeSeo } from "@/lib/seo";
import {
  exportAiCsv,
  exportAiExcel,
  exportCsv,
  exportExcel,
  makeAiExportRows,
  makeExportRows,
} from "@/lib/export";

function LoadingSkeleton() {
  return (
    <div className="grid animate-pulse gap-4">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-28 rounded-xl bg-muted" />)}
      </div>
      <div className="h-[540px] rounded-xl bg-muted" />
    </div>
  );
}

export function Dashboard() {
  const workspace = useVideoWorkspace();
  const ai = useAiSeo(workspace.videos);
  const subtitles = useSubtitles();
  const [channelUrl, setChannelUrl] = useState("https://www.youtube.com/@wp_design_lab");
  const isCurrentChannel = Boolean(
    workspace.sourceUrl && channelUrl.trim() === workspace.sourceUrl.trim(),
  );

  useEffect(() => {
    if (!channelUrl && workspace.sourceUrl) setChannelUrl(workspace.sourceUrl);
  }, [channelUrl, workspace.sourceUrl]);

  const selectedVideos = useMemo(
    () => workspace.videos.filter((video) => workspace.selected.has(video.id)),
    [workspace.selected, workspace.videos],
  );
  const failedAiVideos = useMemo(
    () => workspace.videos.filter((video) => ai.statuses[video.id] === "error"),
    [ai.statuses, workspace.videos],
  );

  function rows(selectedOnly: boolean) {
    const source = selectedOnly ? selectedVideos : workspace.videos;
    if (!source.length) {
      toast.error(selectedOnly ? "Select at least one video first." : "Extract a channel first.");
      return null;
    }
    return makeExportRows(source, workspace.drafts, analyzeSeo);
  }

  async function handleExport(format: "csv" | "xlsx", selectedOnly = false) {
    const data = rows(selectedOnly);
    if (!data) return;
    try {
      format === "csv" ? exportCsv(data) : await exportExcel(data);
      toast.success(`${data.length} videos exported to ${format.toUpperCase()}.`);
    } catch {
      toast.error("The export could not be created.");
    }
  }

  async function handleAiExport(format: "csv" | "xlsx", selectedOnly = false) {
    const source = selectedOnly ? selectedVideos : workspace.videos;
    if (!source.length) {
      toast.error(selectedOnly ? "Select at least one video first." : "Extract a channel first.");
      return;
    }
    const data = makeAiExportRows(source, workspace.drafts, ai.results);
    try {
      format === "csv" ? exportAiCsv(data) : await exportAiExcel(data);
      toast.success(`${data.length} videos exported with AI SEO data.`);
    } catch {
      toast.error("The AI export could not be created.");
    }
  }

  function useAiTitle(title: string) {
    const video = workspace.activeVideo;
    if (!video) return;
    workspace.updateDraft(video.id, {
      title,
      description: workspace.drafts[video.id]?.description || ai.results[video.id]?.seoDescription || video.description,
    });
    toast.success("AI title added to the draft.");
  }

  function useAiDescription(description: string) {
    const video = workspace.activeVideo;
    if (!video) return;
    workspace.updateDraft(video.id, {
      title: workspace.drafts[video.id]?.title || ai.results[video.id]?.seoTitle || video.title,
      description,
    });
    toast.success("AI description added to the draft.");
  }

  function saveAiDraft() {
    const video = workspace.activeVideo;
    const result = video ? ai.results[video.id] : undefined;
    if (!video || !result) return;
    workspace.updateDraft(video.id, {
      title: workspace.drafts[video.id]?.title || result.seoTitle,
      description: workspace.drafts[video.id]?.description || result.seoDescription,
    });
    toast.success("AI result saved as the video draft.");
  }

  function navigateToSection(target: "library" | "ideas" | "related" | "top" | "topics") {
    if (target === "ideas" || target === "related" || target === "top") {
      window.dispatchEvent(new CustomEvent("video-ideas-tab", { detail: target }));
    }
    const id = target === "library"
      ? "video-library"
      : target === "topics"
        ? "planned-topics"
        : "video-ideas";
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <div className="hidden gap-2 md:flex">
              <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={!workspace.videos.length}><Download className="size-4" /> All CSV</Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")} disabled={!workspace.videos.length}><FileSpreadsheet className="size-4" /> All Excel</Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("csv", true)} disabled={!workspace.selected.size}>Selected CSV</Button>
              <Button size="sm" onClick={() => handleExport("xlsx", true)} disabled={!workspace.selected.size}>Selected Excel</Button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 sm:px-6 lg:py-8">
        <section className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-500" /> Metadata only · No API key · No video downloads
            </div>
            <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">Turn your video library into an <span className="text-primary">SEO workspace.</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Extract public channel metadata, identify weak titles and descriptions, create optimized drafts, and export a complete editing plan.</p>
          </div>
          <div className="flex gap-2 md:hidden">
            <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={!workspace.videos.length}>All CSV</Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")} disabled={!workspace.videos.length}>All Excel</Button>
            <Button size="sm" onClick={() => handleExport("xlsx", true)} disabled={!workspace.selected.size}>Selected</Button>
          </div>
        </section>

        <Card className="p-4 sm:p-5">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (!channelUrl.trim()) return toast.error("Enter a YouTube channel URL or @handle.");
              if (isCurrentChannel && workspace.hasMore) {
                workspace.loadMore();
                return;
              }
              if (isCurrentChannel && workspace.videos.length && !workspace.hasMore) {
                return toast.success("All public videos from this channel are already loaded.");
              }
              workspace.extract(channelUrl);
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={channelUrl}
                onChange={(event) => setChannelUrl(event.target.value)}
                placeholder="https://youtube.com/@channel or @channel"
                aria-label="YouTube channel URL"
                disabled={workspace.loading || workspace.loadingMore}
                className="h-12 pl-9"
              />
            </div>
            <Button type="submit" className="h-12 px-6" disabled={workspace.loading || workspace.loadingMore}>
              {workspace.loading || workspace.loadingMore
                ? <LoaderCircle className="size-4 animate-spin" />
                : isCurrentChannel && workspace.hasMore
                  ? <Plus className="size-4" />
                  : <Search className="size-4" />}
              {workspace.loading || workspace.loadingMore
                ? "Extracting metadata..."
                : isCurrentChannel && workspace.hasMore
                  ? "Extract Next 50"
                  : isCurrentChannel && workspace.videos.length
                    ? "All Videos Loaded"
                    : "Extract Videos"}
            </Button>
          </form>
          {(workspace.loading || workspace.loadingMore) && (
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>{workspace.loadingMore ? "Loading the next 50 videos" : "Reading the first 50 videos"}</span>
                <span>{workspace.videos.length} loaded{workspace.totalAvailable ? ` of ${workspace.totalAvailable}` : ""}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-primary" /></div>
            </div>
          )}
        </Card>

        <nav aria-label="Dashboard sections" className="flex flex-wrap gap-2 rounded-xl border bg-card p-2 shadow-sm">
          <Button variant="ghost" size="sm" disabled={!workspace.videos.length} onClick={() => navigateToSection("library")}>
            <ListVideo className="size-4" /> Video Library
          </Button>
          <Button variant="ghost" size="sm" disabled={!workspace.videos.length} onClick={() => navigateToSection("ideas")}>
            <Lightbulb className="size-4" /> Upcoming Video Ideas
          </Button>
          <Button variant="ghost" size="sm" disabled={!workspace.videos.length} onClick={() => navigateToSection("related")}>
            <PlaySquare className="size-4" /> Related Channel Videos
          </Button>
          <Button variant="ghost" size="sm" disabled={!workspace.videos.length} onClick={() => navigateToSection("top")}>
            <TrendingUp className="size-4" /> Top Website Topic Videos
          </Button>
          <Button variant="ghost" size="sm" disabled={!workspace.videos.length} onClick={() => navigateToSection("topics")}>
            <Sparkles className="size-4" /> All Planned Topics
          </Button>
        </nav>

        {workspace.loading && !workspace.videos.length ? <LoadingSkeleton /> : workspace.videos.length ? (
          <>
            <Statistics videos={workspace.videos} />
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold">
                  {workspace.videos.length} videos loaded
                  {workspace.totalAvailable ? ` of ${workspace.totalAvailable}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Statistics and exports currently include loaded videos only.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={workspace.refreshVideos}
                  disabled={workspace.refreshing || workspace.loadingMore || workspace.loading}
                >
                  {workspace.refreshing
                    ? <LoaderCircle className="size-4 animate-spin" />
                    : <RefreshCw className="size-4" />}
                  {workspace.refreshing ? "Refreshing records..." : "Refresh Videos"}
                </Button>
                {workspace.hasMore ? (
                  <Button onClick={workspace.loadMore} disabled={workspace.loadingMore || workspace.loading || workspace.refreshing}>
                    {workspace.loadingMore ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {workspace.loadingMore ? "Loading next batch..." : "Load Next 50"}
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-600">All public videos loaded</span>
                )}
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 font-bold"><Sparkles className="size-4 text-primary" /> Bulk AI processing</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Process two videos at a time. Failed requests are retried once automatically.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={!workspace.selected.size || ai.progress.active}
                    onClick={() => ai.generateBulk(selectedVideos)}
                  >
                    Generate AI SEO For Selected
                  </Button>
                  <Button
                    disabled={!workspace.videos.length || ai.progress.active}
                    onClick={() => ai.generateBulk(workspace.videos)}
                  >
                    Generate AI SEO For All
                  </Button>
                  {ai.progress.failed > 0 && !ai.progress.active ? (
                    <Button variant="secondary" onClick={ai.retryFailed}>Retry {ai.progress.failed} Failed</Button>
                  ) : null}
                  <Button variant="outline" onClick={() => handleAiExport("csv")}>AI CSV</Button>
                  <Button variant="outline" onClick={() => handleAiExport("xlsx")}>AI Excel</Button>
                  <Button variant="ghost" disabled={!workspace.selected.size} onClick={() => handleAiExport("csv", true)}>Selected AI CSV</Button>
                  <Button variant="ghost" disabled={!workspace.selected.size} onClick={() => handleAiExport("xlsx", true)}>Selected AI Excel</Button>
                </div>
              </div>
              {ai.progress.total > 0 ? (
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                    <span>{ai.progress.active ? "Generating AI SEO" : "AI processing complete"}</span>
                    <span>{ai.progress.completed}/{ai.progress.total} · {ai.progress.failed} failed</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${(ai.progress.completed / ai.progress.total) * 100}%` }} />
                  </div>
                </div>
              ) : null}
              {failedAiVideos.length ? (
                <div className="mt-4 space-y-2">
                  {failedAiVideos.map((video) => (
                    <div key={video.id} className="flex flex-col gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">{video.title}</p>
                        <p className="mt-1 text-xs text-red-600">{ai.errors[video.id] || "AI generation failed."}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="ghost" onClick={() => workspace.setActiveId(video.id)}>View</Button>
                        <Button size="sm" variant="outline" onClick={() => ai.retryVideo(video)}>Retry</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
            <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.65fr)_minmax(420px,.75fr)]">
              <div className="min-w-0 space-y-5">
                <VideoTable
                  videos={workspace.paged}
                  totalFiltered={workspace.filtered.length}
                  selected={workspace.selected}
                  editedIds={workspace.editedIds}
                  editedOnly={workspace.editedOnly}
                  refreshingIds={workspace.refreshingIds}
                  thumbnailVersions={workspace.thumbnailVersions}
                  activeId={workspace.activeId}
                  query={workspace.query}
                  sortKey={workspace.sortKey}
                  sortDirection={workspace.sortDirection}
                  page={workspace.page}
                  pageCount={workspace.pageCount}
                  onQuery={workspace.setQuery}
                  onEditedOnly={workspace.setEditedOnly}
                  onRefresh={(video) => { void workspace.refreshVideo(video); }}
                  onSort={workspace.changeSort}
                  onPage={workspace.setPage}
                  onSelect={workspace.toggleSelected}
                  onSelectPage={workspace.togglePage}
                  onActivate={workspace.setActiveId}
                  onGenerateSubtitles={(video) => { void subtitles.generate(video); }}
                  onPreviewSubtitles={subtitles.preview}
                  subtitleLoadingIds={subtitles.loadingIds}
                  subtitleGeneratedIds={new Set(Object.keys(subtitles.results))}
                />
                <UpcomingVideoIdeas videos={workspace.videos} activeVideo={workspace.activeVideo} />
                <ContentTopicPlanner videos={workspace.videos} />
              </div>
              <OptimizationPanel
                video={workspace.activeVideo}
                savedDraft={workspace.activeVideo ? workspace.drafts[workspace.activeVideo.id] : undefined}
                aiResult={workspace.activeVideo ? ai.results[workspace.activeVideo.id] : undefined}
                aiLoading={workspace.activeVideo ? ai.statuses[workspace.activeVideo.id] === "loading" : false}
                aiError={workspace.activeVideo ? ai.errors[workspace.activeVideo.id] : undefined}
                thumbnailVersion={workspace.activeVideo ? workspace.thumbnailVersions[workspace.activeVideo.id] : undefined}
                onSaveDraft={workspace.updateDraft}
                onGenerateAi={(video) => { void ai.generate(video); }}
                onUseTitle={useAiTitle}
                onUseDescription={useAiDescription}
                onSaveAi={saveAiDraft}
              />
            </div>
          </>
        ) : (
          <Card className="grid min-h-[360px] place-items-center border-dashed p-8 text-center">
            <div>
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Search className="size-6" /></div>
              <h2 className="text-lg font-bold">Your video workspace is empty</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Enter a public YouTube channel URL, handle, or Videos URL above. Private, members-only, deleted, and unavailable videos are excluded.</p>
            </div>
          </Card>
        )}
      </main>
      <SubtitleModal
        open={subtitles.open}
        video={subtitles.activeVideo}
        result={subtitles.activeResult}
        loading={Boolean(subtitles.activeVideo && subtitles.loadingIds.has(subtitles.activeVideo.id))}
        error={subtitles.error}
        onClose={subtitles.close}
        onRegenerate={() => {
          if (subtitles.activeVideo) void subtitles.generate(subtitles.activeVideo, true);
        }}
        onDownload={subtitles.download}
      />
    </div>
  );
}

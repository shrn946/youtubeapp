"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown, Captions, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Pencil, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { analyzeSeo } from "@/lib/seo";
import { cacheBustedUrl, cn, formatDuration, formatNumber, formatShortDate } from "@/lib/utils";
import type { SortDirection, SortKey, Video } from "@/types/video";

interface Props {
  videos: Video[];
  totalFiltered: number;
  selected: Set<string>;
  editedIds: Set<string>;
  editedOnly: boolean;
  refreshingIds: Set<string>;
  thumbnailVersions: Record<string, number>;
  activeId: string | null;
  query: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
  page: number;
  pageCount: number;
  onQuery: (value: string) => void;
  onEditedOnly: (value: boolean) => void;
  onRefresh: (video: Video) => void;
  onSort: (key: SortKey) => void;
  onPage: (page: number) => void;
  onSelect: (id: string) => void;
  onSelectPage: () => void;
  onActivate: (id: string) => void;
  onGenerateSubtitles: (video: Video) => void;
  onPreviewSubtitles: (video: Video) => void;
  subtitleLoadingIds: Set<string>;
  subtitleGeneratedIds: Set<string>;
}

const columns = "grid-cols-[32px_72px_minmax(180px,1.25fr)_minmax(160px,1fr)_80px_64px_64px]";

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function SortButton({ field, current, direction, onSort, children }: {
  field: SortKey; current: SortKey; direction: SortDirection; onSort: (key: SortKey) => void; children: React.ReactNode;
}) {
  const Icon = current !== field ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button className="focus-ring flex items-center gap-1 rounded text-left hover:text-foreground" onClick={() => onSort(field)}>
      {children}<Icon className="size-3.5" />
    </button>
  );
}

function paginationItems(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const visible = [...pages].filter((item) => item >= 1 && item <= pageCount).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  visible.forEach((item, index) => {
    if (index > 0 && item - visible[index - 1] > 1) items.push("ellipsis");
    items.push(item);
  });
  return items;
}

export function VideoTable(props: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: props.videos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 106,
    overscan: 8,
  });
  const allPageSelected = props.videos.length > 0 && props.videos.every((video) => props.selected.has(video.id));

  return (
    <Card id="video-library" className="scroll-mt-24 min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">Video library</h2>
          <p className="text-xs text-muted-foreground">{props.totalFiltered} matching videos · {props.selected.size} selected</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant={props.editedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => props.onEditedOnly(!props.editedOnly)}
            aria-pressed={props.editedOnly}
          >
            Edited only ({props.editedIds.size})
          </Button>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={props.query} onChange={(event) => props.onQuery(event.target.value)} placeholder="Search original or edited text" className="pl-9" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="min-w-0">
          <div className={cn("grid h-11 items-center gap-3 border-b bg-muted/50 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground", columns)}>
            <input type="checkbox" aria-label="Select this page" checked={allPageSelected} onChange={props.onSelectPage} className="size-4 accent-[hsl(var(--primary))]" />
            <span>Thumbnail</span>
            <SortButton field="title" current={props.sortKey} direction={props.sortDirection} onSort={props.onSort}>Title</SortButton>
            <span>Description</span>
            <SortButton field="seoScore" current={props.sortKey} direction={props.sortDirection} onSort={props.onSort}>Current SEO</SortButton>
            <SortButton field="uploadDate" current={props.sortKey} direction={props.sortDirection} onSort={props.onSort}>Date</SortButton>
            <SortButton field="views" current={props.sortKey} direction={props.sortDirection} onSort={props.onSort}>Views</SortButton>
          </div>
          <div ref={parentRef} className="scrollbar-thin h-[564px] overflow-auto">
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const video = props.videos[virtualRow.index];
                const seo = analyzeSeo(video.title, video.description);
                return (
                  <div
                    key={video.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}
                    className={cn("grid min-h-[94px] cursor-pointer items-center gap-3 border-b px-4 py-3 text-sm transition hover:bg-muted/40", columns, props.activeId === video.id && "bg-primary/5")}
                    onClick={() => props.onActivate(video.id)}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${video.title}`}
                      checked={props.selected.has(video.id)}
                      onChange={() => props.onSelect(video.id)}
                      onClick={(event) => event.stopPropagation()}
                      className="size-4 accent-[hsl(var(--primary))]"
                    />
                    <div className="relative h-10 w-[70px] overflow-hidden rounded-lg bg-muted">
                      {video.thumbnail ? <img src={cacheBustedUrl(video.thumbnail, props.thumbnailVersions[video.id])} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                      <button
                        type="button"
                        title="Refresh this video record"
                        aria-label={`Refresh ${video.title}`}
                        disabled={props.refreshingIds.has(video.id)}
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onRefresh(video);
                        }}
                        className="focus-ring absolute left-1 top-1 grid size-6 place-items-center rounded bg-black/75 text-white shadow transition hover:bg-black/90 disabled:cursor-wait"
                      >
                        {props.refreshingIds.has(video.id)
                          ? <LoaderCircle className="size-3.5 animate-spin" />
                          : <RefreshCw className="size-3.5" />}
                      </button>
                      <span
                        className="absolute bottom-1 right-1 rounded bg-black/75 px-1 py-0.5 font-mono text-[10px] font-bold leading-none text-white"
                        style={{ textShadow: "0 1px 3px rgba(0, 0, 0, 0.95)" }}
                      >
                        {formatDuration(video.duration)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start gap-2">
                        <p className="line-clamp-2 font-semibold leading-snug">{video.title}</p>
                        {props.editedIds.has(video.id) ? (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            Edited
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <a href={video.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          Open video <ExternalLink className="size-3" />
                        </a>
                        <a
                          href={`https://studio.youtube.com/video/${encodeURIComponent(video.id)}/edit`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                        >
                          Edit in Studio <Pencil className="size-3" />
                        </a>
                        {props.subtitleGeneratedIds.has(video.id) ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              props.onPreviewSubtitles(video);
                            }}
                            className="focus-ring inline-flex items-center gap-1 rounded text-xs font-semibold text-emerald-600 hover:underline"
                          >
                            <CheckCircle2 className="size-3" /> Subtitle generated · Preview
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={props.subtitleLoadingIds.has(video.id)}
                            onClick={(event) => {
                              event.stopPropagation();
                              props.onGenerateSubtitles(video);
                            }}
                            className="focus-ring inline-flex items-center gap-1 rounded text-xs font-semibold text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
                          >
                            {props.subtitleLoadingIds.has(video.id)
                              ? <LoaderCircle className="size-3 animate-spin" />
                              : <Captions className="size-3" />}
                            {props.subtitleLoadingIds.has(video.id) ? "Generating subtitles..." : "Generate Subtitles"}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{video.description || "No description"}</p>
                    <div title={`Title ${seo.titleScore}/50, description ${seo.descriptionScore}/50`}>
                      <p className={cn("text-base font-bold tabular-nums", scoreColor(seo.score))}>{seo.score}/100</p>
                      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                        Title {seo.titleScore}/50
                        <br />
                        Desc {seo.descriptionScore}/50
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-[11px]">{formatShortDate(video.uploadDate)}</span>
                    <span className="font-semibold">{formatNumber(video.views)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">Page {props.page} of {props.pageCount}</p>
        <nav aria-label="Video library pagination" className="flex flex-wrap items-center justify-center gap-1">
          <Button variant="outline" size="sm" disabled={props.page <= 1} onClick={() => props.onPage(props.page - 1)}><ChevronLeft className="size-4" /> Previous</Button>
          {paginationItems(props.page, props.pageCount).map((item, index) => item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="grid h-9 min-w-7 place-items-center px-1 text-sm text-muted-foreground">...</span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={item === props.page ? "default" : "outline"}
              size="sm"
              className="min-w-9 px-2"
              aria-current={item === props.page ? "page" : undefined}
              aria-label={`Go to page ${item}`}
              onClick={() => props.onPage(item)}
            >
              {item}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={props.page >= props.pageCount} onClick={() => props.onPage(props.page + 1)}>Next <ChevronRight className="size-4" /></Button>
        </nav>
      </div>
    </Card>
  );
}

"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ExternalLink, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatDate, formatDuration, formatNumber } from "@/lib/utils";
import type { SortDirection, SortKey, Video } from "@/types/video";

interface Props {
  videos: Video[];
  totalFiltered: number;
  selected: Set<string>;
  activeId: string | null;
  query: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
  page: number;
  pageCount: number;
  onQuery: (value: string) => void;
  onSort: (key: SortKey) => void;
  onPage: (page: number) => void;
  onSelect: (id: string) => void;
  onSelectPage: () => void;
  onActivate: (id: string) => void;
}

const columns = "grid-cols-[42px_88px_minmax(220px,1.25fr)_minmax(260px,1.5fr)_130px_95px_110px]";

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

export function VideoTable(props: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: props.videos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 94,
    overscan: 8,
  });
  const allPageSelected = props.videos.length > 0 && props.videos.every((video) => props.selected.has(video.id));

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">Video library</h2>
          <p className="text-xs text-muted-foreground">{props.totalFiltered} matching videos · {props.selected.size} selected</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={props.query} onChange={(event) => props.onQuery(event.target.value)} placeholder="Search titles and descriptions" className="pl-9" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1080px]">
          <div className={cn("grid h-11 items-center gap-3 border-b bg-muted/50 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground", columns)}>
            <input type="checkbox" aria-label="Select this page" checked={allPageSelected} onChange={props.onSelectPage} className="size-4 accent-[hsl(var(--primary))]" />
            <span>Video</span>
            <SortButton field="title" current={props.sortKey} direction={props.sortDirection} onSort={props.onSort}>Title</SortButton>
            <span>Description</span>
            <SortButton field="uploadDate" current={props.sortKey} direction={props.sortDirection} onSort={props.onSort}>Published</SortButton>
            <span>Duration</span>
            <SortButton field="views" current={props.sortKey} direction={props.sortDirection} onSort={props.onSort}>Views</SortButton>
          </div>
          <div ref={parentRef} className="scrollbar-thin h-[564px] overflow-auto">
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const video = props.videos[virtualRow.index];
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
                    <div className="relative h-12 w-[84px] overflow-hidden rounded-lg bg-muted">
                      {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold leading-snug">{video.title}</p>
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
                      </div>
                    </div>
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{video.description || "No description"}</p>
                    <span className="text-xs">{formatDate(video.uploadDate)}</span>
                    <span className="font-mono text-xs">{formatDuration(video.duration)}</span>
                    <span className="font-semibold">{formatNumber(video.views)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">Page {props.page} of {props.pageCount}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={props.page <= 1} onClick={() => props.onPage(props.page - 1)}><ChevronLeft className="size-4" /> Previous</Button>
          <Button variant="outline" size="sm" disabled={props.page >= props.pageCount} onClick={() => props.onPage(props.page + 1)}>Next <ChevronRight className="size-4" /></Button>
        </div>
      </div>
    </Card>
  );
}

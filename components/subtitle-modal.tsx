"use client";

import { useEffect } from "react";
import { CheckCircle2, Clipboard, Download, LoaderCircle, RefreshCw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SubtitleResult, Video } from "@/types/video";

export function SubtitleModal({
  open,
  video,
  result,
  loading,
  error,
  onClose,
  onRegenerate,
  onDownload,
}: {
  open: boolean;
  video: Video | null;
  result: SubtitleResult | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRegenerate: () => void;
  onDownload: (result: SubtitleResult) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open || !video) return null;

  function copySrt() {
    if (!result) return;
    navigator.clipboard.writeText(result.srt)
      .then(() => toast.success("SRT copied."))
      .catch(() => toast.error("Clipboard access was denied."));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subtitle-modal-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b p-4">
          <div className="min-w-0">
            <h2 id="subtitle-modal-title" className="font-bold">AI Subtitle Generator</h2>
            <p className="mt-1 truncate text-xs text-muted-foreground">{video.title}</p>
          </div>
          <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={onClose} aria-label="Close subtitle preview">
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid min-h-72 place-items-center text-center">
              <div>
                <LoaderCircle className="mx-auto size-8 animate-spin text-primary" />
                <p className="mt-3 text-sm font-bold">Generating YouTube subtitles...</p>
                <p className="mt-1 text-xs text-muted-foreground">Checking public captions, then validating the SRT file.</p>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">{error}</div>
          ) : null}

          {result && !loading ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> Subtitle generated successfully
                <span className="ml-auto text-[10px] font-normal uppercase tracking-wider">
                  {result.source === "transcript" ? "Public transcript used" : "Metadata draft"}
                </span>
              </div>
              {result.source === "metadata" ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                  No public transcript was available. This SRT is an AI timing draft based on the title, description, and duration, so review it against the spoken audio before uploading.
                </div>
              ) : null}
              <div>
                <p className="mb-2 text-xs font-bold">Preview: {result.filename}</p>
                <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-xl border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
                  {result.srt}
                </pre>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t p-4">
          <Button variant="outline" disabled={!result || loading} onClick={() => result && onDownload(result)}>
            <Download className="size-4" /> Download SRT
          </Button>
          <Button variant="outline" disabled={!result || loading} onClick={copySrt}>
            <Clipboard className="size-4" /> Copy SRT
          </Button>
          <Button variant="outline" disabled={loading} onClick={onRegenerate}>
            <RefreshCw className="size-4" /> Regenerate
          </Button>
          <Button disabled title="YouTube upload support is planned for a future release">
            <Upload className="size-4" /> Upload to YouTube
          </Button>
        </div>
      </div>
    </div>
  );
}

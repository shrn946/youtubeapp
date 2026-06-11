"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { analyzeSeo, generateSeoDraft } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { Video, VideoDraft } from "@/types/video";

function copy(value: string, label: string) {
  navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied.`)).catch(() => toast.error("Clipboard access was denied."));
}

export function SeoEditor({ video, savedDraft, onSave }: {
  video: Video | null;
  savedDraft?: VideoDraft;
  onSave: (id: string, draft: VideoDraft) => void;
}) {
  const [draft, setDraft] = useState<VideoDraft>({ title: "", description: "" });
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    setDraft(savedDraft ?? { title: video?.title ?? "", description: video?.description ?? "" });
    setGenerated(false);
  }, [savedDraft, video]);

  const analysis = useMemo(
    () => analyzeSeo(draft.title, draft.description, video?.title),
    [draft, video?.title],
  );

  if (!video) {
    return (
      <Card className="grid min-h-96 place-items-center p-8 text-center">
        <div>
          <Sparkles className="mx-auto mb-3 size-9 text-muted-foreground" />
          <h2 className="font-bold">Select a video to optimize</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">Choose a row from the video library to review its metadata and create an SEO draft.</p>
        </div>
      </Card>
    );
  }

  const titleStatus = draft.title.length < 50 ? "Too short" : draft.title.length > 70 ? "Too long" : "Optimal";
  const titleColor = draft.title.length >= 50 && draft.title.length <= 70 ? "text-emerald-600" : "text-amber-600";

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="font-bold">SEO optimization</h2>
          <p className="text-xs text-muted-foreground">Draft changes are local until exported.</p>
        </div>
        <div className={cn("grid size-12 place-items-center rounded-full border-4 text-sm font-extrabold", analysis.score >= 75 ? "border-emerald-500 text-emerald-600" : analysis.score >= 50 ? "border-amber-500 text-amber-600" : "border-red-500 text-red-600")}>
          {analysis.score}
        </div>
      </div>

      <div className="space-y-5 p-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Original title</p>
            <p className="text-sm font-semibold leading-relaxed">{video.title}</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Original description</p>
            <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">{video.description || "No description"}</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="seo-title" className="text-sm font-semibold">New SEO title</label>
            <span className={cn("text-xs font-semibold", titleColor)}>{draft.title.length}/70 · {titleStatus}</span>
          </div>
          <div className="flex gap-2">
            <Input id="seo-title" value={draft.title} maxLength={100} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            <Button variant="outline" size="icon" aria-label="Copy SEO title" onClick={() => copy(draft.title, "Title")}><Clipboard className="size-4" /></Button>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full transition-all", titleStatus === "Optimal" ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${Math.min(100, draft.title.length / 0.7)}%` }} />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="seo-description" className="text-sm font-semibold">New SEO description</label>
            <span className="text-xs text-muted-foreground">{draft.description.length} characters</span>
          </div>
          <Textarea id="seo-description" rows={8} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2 text-xs leading-relaxed">
            <span className="font-bold text-primary">First 150 characters: </span>
            <mark className="bg-primary/10 text-foreground">{draft.description.slice(0, 150) || "Start with a keyword-rich summary."}</mark>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setDraft(generateSeoDraft(video)); setGenerated(true); toast.success("SEO suggestion generated."); }}>
            <Sparkles className="size-4" /> Generate Better SEO
          </Button>
          <Button variant="outline" onClick={() => copy(draft.description, "Description")}><Clipboard className="size-4" /> Copy description</Button>
          <Button variant="secondary" onClick={() => { onSave(video.id, draft); toast.success("Draft saved."); }}><Check className="size-4" /> Save draft</Button>
        </div>

        {generated && (
          <div className="grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Original</p>
              <p className="text-sm font-semibold">{video.title}</p>
              <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{video.description || "No description"}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-primary">Suggested</p>
              <p className="text-sm font-semibold">{draft.title}</p>
              <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{draft.description}</p>
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">SEO analysis</h3>
            <span className="text-xs text-muted-foreground">Title {analysis.titleScore}/50 · Description {analysis.descriptionScore}/50</span>
          </div>
          <ul className="space-y-2">
            {analysis.suggestions.length ? analysis.suggestions.map((suggestion) => (
              <li key={suggestion} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />{suggestion}
              </li>
            )) : <li className="text-xs text-emerald-600">The draft covers all core SEO checks.</li>}
          </ul>
        </div>
      </div>
    </Card>
  );
}

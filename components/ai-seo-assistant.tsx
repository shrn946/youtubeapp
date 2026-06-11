"use client";

import { Check, Clipboard, ExternalLink, LoaderCircle, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AiSeoResult, Video } from "@/types/video";

function copy(value: string, label: string) {
  navigator.clipboard.writeText(value)
    .then(() => toast.success(`${label} copied.`))
    .catch(() => toast.error("Clipboard access was denied."));
}

function Chips({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className="rounded-full border bg-muted/60 px-2.5 py-1 text-xs">{value}</span>
      ))}
    </div>
  );
}

function SectionHeading({ title, onCopy }: { title: string; onCopy: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-sm font-bold">{title}</h3>
      <Button size="sm" variant="ghost" onClick={onCopy}><Clipboard className="size-3.5" /> Copy</Button>
    </div>
  );
}

export function AiSeoAssistant({
  video,
  result,
  loading,
  error,
  onGenerate,
  onUseTitle,
  onUseDescription,
  onSave,
}: {
  video: Video | null;
  result?: AiSeoResult;
  loading: boolean;
  error?: string;
  onGenerate: (video: Video) => void;
  onUseTitle: (title: string) => void;
  onUseDescription: (description: string) => void;
  onSave: () => void;
}) {
  if (!video) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold"><Sparkles className="size-4 text-primary" /> AI SEO Assistant</h2>
          <p className="text-xs text-muted-foreground">Provider-independent AI optimization</p>
        </div>
        {result ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{result.seoScore}/100</span> : null}
      </div>

      <div className="space-y-5 p-4">
        <div className="space-y-2 rounded-xl bg-muted/50 p-3 text-xs">
          <p><span className="font-bold">Current title:</span> {video.title}</p>
          <p className="line-clamp-3"><span className="font-bold">Description:</span> {video.description || "No description"}</p>
          <div className="flex flex-wrap gap-3">
            <a href={video.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Video URL <ExternalLink className="size-3" />
            </a>
            <a
              href={`https://studio.youtube.com/video/${encodeURIComponent(video.id)}/edit`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline"
            >
              Edit in YouTube Studio <Pencil className="size-3" />
            </a>
          </div>
        </div>

        <Button className="w-full" disabled={loading} onClick={() => onGenerate(video)}>
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : result ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}
          {loading ? "Generating AI SEO..." : result ? "Regenerate AI SEO" : "Generate AI SEO"}
        </Button>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 rounded-xl bg-muted" />
            <div className="h-28 rounded-xl bg-muted" />
            <div className="h-20 rounded-xl bg-muted" />
          </div>
        ) : null}
        {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">{error}</div> : null}

        {result && !loading ? (
          <>
            <section>
              <SectionHeading title="Primary keyword" onCopy={() => copy(result.primaryKeyword, "Primary keyword")} />
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm font-bold text-primary">{result.primaryKeyword}</div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold">Title alternatives</h3>
              <div className="space-y-2">
                {result.titleOptions.map((title, index) => (
                  <div key={`${index}-${title}`} className={index === result.bestTitleIndex ? "rounded-xl border border-emerald-500/50 bg-emerald-500/5 p-3" : "rounded-xl border p-3"}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Option {index + 1} · {title.length}/70</p>
                      {index === result.bestTitleIndex ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">Best title</span> : null}
                    </div>
                    <p className="text-sm font-semibold">{title}</p>
                    {index === result.bestTitleIndex ? <p className="mt-2 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">{result.bestTitleReason}</p> : null}
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(title, "Title")}><Clipboard className="size-3.5" /> Copy</Button>
                      <Button size="sm" onClick={() => onUseTitle(title)}><Check className="size-3.5" /> Use This Title</Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold">Description variations</h3>
              <div className="space-y-2">
                {result.descriptionOptions.map((description, index) => (
                  <details key={index} className={index === result.bestDescriptionIndex ? "rounded-xl border border-emerald-500/50 bg-emerald-500/5 p-3" : "rounded-xl border p-3"} open={index === result.bestDescriptionIndex}>
                    <summary className="cursor-pointer text-xs font-bold">
                      Variation {index + 1}
                      {index === result.bestDescriptionIndex ? <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase text-emerald-600">Best description</span> : null}
                    </summary>
                    {index === result.bestDescriptionIndex ? <p className="mt-2 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">{result.bestDescriptionReason}</p> : null}
                    <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{description}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(description, "Description")}><Clipboard className="size-3.5" /> Copy</Button>
                      <Button size="sm" onClick={() => onUseDescription(description)}><Check className="size-3.5" /> Use Description</Button>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading title="Secondary keywords" onCopy={() => copy(result.secondaryKeywords.join(", "), "Secondary keywords")} />
              <Chips values={result.secondaryKeywords} />
            </section>

            <section>
              <SectionHeading title="Related search keywords" onCopy={() => copy(result.relatedSearchKeywords.join("\n"), "Related searches")} />
              <div className="space-y-2">
                {result.relatedSearchKeywords.map((keyword) => (
                  <div key={keyword} className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">{keyword}</div>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading title="Tags" onCopy={() => copy(result.tags.join(", "), "Tags")} />
              <Chips values={result.tags} />
            </section>

            <section>
              <SectionHeading title="Focus keywords" onCopy={() => copy([result.primaryKeyword, ...result.secondaryKeywords].join(", "), "Focus keywords")} />
              <Chips values={[result.primaryKeyword, ...result.secondaryKeywords]} />
            </section>

            <section>
              <SectionHeading title="Hashtags" onCopy={() => copy(result.hashtags.join(" "), "Hashtags")} />
              <Chips values={result.hashtags} />
            </section>

            <section>
              <SectionHeading
                title="Related video suggestions"
                onCopy={() => copy(result.relatedVideoSuggestions.map((item) => `${item.title}\n${item.url}`).join("\n\n"), "Related videos")}
              />
              <div className="space-y-2">
                {result.relatedVideoSuggestions.map((item) => (
                  <div key={item.url} className="rounded-xl border p-3">
                    <p className="text-xs font-semibold">{item.title}</p>
                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-primary hover:underline">{item.url}</a>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading title="Pinned comment" onCopy={() => copy(result.pinnedComment, "Pinned comment")} />
              <div className="whitespace-pre-wrap rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed">{result.pinnedComment}</div>
            </section>

            <section>
              <SectionHeading
                title="Video chapters"
                onCopy={() => copy(result.chapters.map((chapter) => `${chapter.timestamp} ${chapter.title}`).join("\n"), "Video chapters")}
              />
              <div className="rounded-xl border bg-muted/30 p-3 font-mono text-xs leading-7">
                {result.chapters.map((chapter) => <div key={`${chapter.timestamp}-${chapter.title}`}>{chapter.timestamp} {chapter.title}</div>)}
              </div>
            </section>

            <section>
              <SectionHeading title="CTR improvement suggestions" onCopy={() => copy(result.ctrSuggestions.join("\n"), "CTR suggestions")} />
              <div className="grid gap-2">
                {result.ctrSuggestions.map((suggestion) => (
                  <div key={suggestion} className="rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed">{suggestion}</div>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading
                title="Thumbnail redesign prompt"
                onCopy={() => copy(result.thumbnailRedesignPrompt, "Thumbnail redesign prompt")}
              />
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={`Current thumbnail for ${video.title}`}
                  className="mb-3 aspect-video w-full rounded-xl border object-cover"
                />
              ) : null}
              <div className="whitespace-pre-wrap rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed">
                {result.thumbnailRedesignPrompt}
              </div>
            </section>

            <Button variant="secondary" className="w-full" onClick={onSave}><Check className="size-4" /> Save AI Draft</Button>
            <p className="text-center text-[10px] text-muted-foreground">
              Generated with {result.provider} · {new Date(result.generatedAt).toLocaleString()}
            </p>
          </>
        ) : null}
      </div>
    </Card>
  );
}

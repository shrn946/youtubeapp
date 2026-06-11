"use client";

import { useEffect, useState } from "react";
import { Sparkles, WandSparkles } from "lucide-react";
import { AiSeoAssistant } from "@/components/ai-seo-assistant";
import { SeoEditor } from "@/components/seo-editor";
import { cn } from "@/lib/utils";
import type { AiSeoResult, Video, VideoDraft } from "@/types/video";

export function OptimizationPanel({
  video,
  savedDraft,
  aiResult,
  aiLoading,
  aiError,
  onSaveDraft,
  onGenerateAi,
  onUseTitle,
  onUseDescription,
  onSaveAi,
}: {
  video: Video | null;
  savedDraft?: VideoDraft;
  aiResult?: AiSeoResult;
  aiLoading: boolean;
  aiError?: string;
  onSaveDraft: (id: string, draft: VideoDraft) => void;
  onGenerateAi: (video: Video) => void;
  onUseTitle: (title: string) => void;
  onUseDescription: (description: string) => void;
  onSaveAi: () => void;
}) {
  const [tab, setTab] = useState<"seo" | "ai">("seo");

  useEffect(() => {
    setTab("seo");
  }, [video?.id]);

  return (
    <div className="min-w-0">
      <div className="mb-3 grid grid-cols-2 rounded-xl border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setTab("seo")}
          className={cn(
            "focus-ring flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition",
            tab === "seo" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <WandSparkles className="size-4" /> SEO Optimization
        </button>
        <button
          type="button"
          onClick={() => setTab("ai")}
          className={cn(
            "focus-ring flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition",
            tab === "ai" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="size-4" /> AI SEO Assistant
          {aiResult ? <span className="size-1.5 rounded-full bg-emerald-500" /> : null}
        </button>
      </div>

      {tab === "seo" ? (
        <SeoEditor video={video} savedDraft={savedDraft} onSave={onSaveDraft} />
      ) : (
        <AiSeoAssistant
          video={video}
          result={aiResult}
          loading={aiLoading}
          error={aiError}
          onGenerate={onGenerateAi}
          onUseTitle={onUseTitle}
          onUseDescription={onUseDescription}
          onSave={onSaveAi}
        />
      )}
    </div>
  );
}

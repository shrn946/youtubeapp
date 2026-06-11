import { AlignLeft, CalendarArrowDown, CalendarArrowUp, CircleAlert, CircleCheck, Eye, Gauge, Type, VideoIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { analyzeSeo } from "@/lib/seo";
import { formatDate, formatNumber } from "@/lib/utils";
import type { Video } from "@/types/video";

export function Statistics({ videos }: { videos: Video[] }) {
  const seoAnalyses = videos.map((video) => analyzeSeo(video.title, video.description));
  const averageSeo = seoAnalyses.length
    ? Math.round(seoAnalyses.reduce((sum, analysis) => sum + analysis.score, 0) / seoAnalyses.length)
    : 0;
  const averageTitleSeo = seoAnalyses.length
    ? Math.round(seoAnalyses.reduce((sum, analysis) => sum + analysis.titleScore, 0) / seoAnalyses.length)
    : 0;
  const averageDescriptionSeo = seoAnalyses.length
    ? Math.round(seoAnalyses.reduce((sum, analysis) => sum + analysis.descriptionScore, 0) / seoAnalyses.length)
    : 0;
  const strongSeo = seoAnalyses.filter((analysis) => analysis.score >= 80).length;
  const needsWorkSeo = seoAnalyses.filter((analysis) => analysis.score < 60).length;
  const averageTitle = videos.length ? Math.round(videos.reduce((sum, video) => sum + video.title.length, 0) / videos.length) : 0;
  const averageDescription = videos.length ? Math.round(videos.reduce((sum, video) => sum + video.description.length, 0) / videos.length) : 0;
  const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
  const dated = videos.filter((video) => video.uploadDate).sort((a, b) => String(a.uploadDate).localeCompare(String(b.uploadDate)));
  const seoStats = [
    { label: "Overall SEO", value: `${averageSeo}/100`, progress: averageSeo, icon: Gauge, barClass: "bg-primary" },
    { label: "Avg. title SEO", value: `${averageTitleSeo}/50`, progress: averageTitleSeo * 2, icon: Type, barClass: "bg-primary" },
    { label: "Avg. description SEO", value: `${averageDescriptionSeo}/50`, progress: averageDescriptionSeo * 2, icon: AlignLeft, barClass: "bg-primary" },
    {
      label: "Strong SEO (80+)",
      value: formatNumber(strongSeo),
      progress: videos.length ? (strongSeo / videos.length) * 100 : 0,
      icon: CircleCheck,
      barClass: "bg-emerald-500",
    },
    {
      label: "Needs work (<60)",
      value: formatNumber(needsWorkSeo),
      progress: videos.length ? (needsWorkSeo / videos.length) * 100 : 0,
      icon: CircleAlert,
      barClass: "bg-red-500",
    },
  ];
  const channelStats = [
    { label: "Total videos", value: formatNumber(videos.length), icon: VideoIcon },
    { label: "Avg. title length", value: `${averageTitle} chars`, icon: Type },
    { label: "Avg. description", value: `${averageDescription} chars`, icon: AlignLeft },
    { label: "Total views", value: formatNumber(totalViews), icon: Eye },
    { label: "Newest video", value: formatDate(dated.at(-1)?.uploadDate ?? null), icon: CalendarArrowUp },
    { label: "Oldest video", value: formatDate(dated[0]?.uploadDate ?? null), icon: CalendarArrowDown },
  ];

  return (
    <div className="space-y-5">
      <section aria-labelledby="seo-statistics-heading">
        <h2 id="seo-statistics-heading" className="mb-3 text-sm font-bold">Overall SEO statistics</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {seoStats.map(({ label, value, progress, icon: Icon, barClass }) => (
            <Card key={label} className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
              </div>
              <p className="truncate text-xl font-bold tracking-tight">{value}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className={`h-full rounded-full transition-all ${barClass}`}
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] font-medium text-muted-foreground">
                {Math.round(progress)}% {label.includes("SEO (") || label.startsWith("Needs") ? "of loaded videos" : "of maximum score"}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="channel-statistics-heading">
        <h2 id="channel-statistics-heading" className="mb-3 text-sm font-bold">Channel statistics</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {channelStats.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
              </div>
              <p className="truncate text-xl font-bold tracking-tight">{value}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

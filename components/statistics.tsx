import { AlignLeft, CalendarArrowDown, CalendarArrowUp, Eye, Type, VideoIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/utils";
import type { Video } from "@/types/video";

export function Statistics({ videos }: { videos: Video[] }) {
  const averageTitle = videos.length ? Math.round(videos.reduce((sum, video) => sum + video.title.length, 0) / videos.length) : 0;
  const averageDescription = videos.length ? Math.round(videos.reduce((sum, video) => sum + video.description.length, 0) / videos.length) : 0;
  const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
  const dated = videos.filter((video) => video.uploadDate).sort((a, b) => String(a.uploadDate).localeCompare(String(b.uploadDate)));
  const stats = [
    { label: "Total videos", value: formatNumber(videos.length), icon: VideoIcon },
    { label: "Avg. title length", value: `${averageTitle} chars`, icon: Type },
    { label: "Avg. description", value: `${averageDescription} chars`, icon: AlignLeft },
    { label: "Total views", value: formatNumber(totalViews), icon: Eye },
    { label: "Newest video", value: formatDate(dated.at(-1)?.uploadDate ?? null), icon: CalendarArrowUp },
    { label: "Oldest video", value: formatDate(dated[0]?.uploadDate ?? null), icon: CalendarArrowDown },
  ];

  return (
    <section aria-label="Channel statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {stats.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
          </div>
          <p className="truncate text-xl font-bold tracking-tight">{value}</p>
        </Card>
      ))}
    </section>
  );
}

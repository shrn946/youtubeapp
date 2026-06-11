import { Play, TrendingUp } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-10 place-items-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
        <Play className="size-5 fill-current" />
        <TrendingUp className="absolute -bottom-1 -right-1 size-4 rounded-full bg-foreground p-0.5 text-background" />
      </div>
      <div>
        <p className="text-sm font-extrabold leading-none tracking-tight sm:text-base">YouTube SEO</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Manager</p>
      </div>
    </div>
  );
}

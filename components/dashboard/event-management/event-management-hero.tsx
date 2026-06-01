import Link from "next/link";

import { formatMetricNumber } from "@/lib/dashboard/engagement-metrics";

type EventManagementHeroProps = {
  eventName: string;
  eventSlug: string;
  publicPath: string;
  mediaCount: number;
  favoriteCount: number;
  totalLikes: number;
  lastUpdatedAt: string;
};

function formatDate(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function EventManagementHero({
  eventName,
  eventSlug,
  publicPath,
  mediaCount,
  favoriteCount,
  totalLikes,
  lastUpdatedAt,
}: EventManagementHeroProps) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
            Evento
          </p>
          <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-white sm:text-[1.65rem]">
            {eventName}
          </h1>
          <p className="mt-1 truncate font-mono text-xs text-white/45 sm:text-sm">
            {eventSlug}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="rounded-full border border-white/8 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white/70">
            {formatMetricNumber(mediaCount)} mídias
          </span>
          <span className="rounded-full border border-white/8 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white/70">
            {formatMetricNumber(totalLikes)} curtidas
          </span>
          <span className="rounded-full border border-white/8 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white/70">
            {formatMetricNumber(favoriteCount)} favoritas
          </span>
          <Link
            href={publicPath}
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/12 px-4 text-xs font-bold text-white/80 transition hover:bg-white/10"
          >
            Abrir galeria
          </Link>
        </div>
      </div>

      <p className="mt-3 text-xs text-white/35">
        Atualizado em {formatDate(lastUpdatedAt)}
      </p>
    </div>
  );
}

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

function formatRelativeUpdate(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "sem atualização recente";
  }

  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "atualizado hoje";
  }

  if (diffDays === 1) {
    return "atualizado ontem";
  }

  if (diffDays < 7) {
    return `atualizado há ${diffDays} dias`;
  }

  return `atualizado em ${new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(timestamp))}`;
}

export function EventManagementHero({
  eventName,
  publicPath,
  mediaCount,
  totalLikes,
  lastUpdatedAt,
}: EventManagementHeroProps) {
  const statsLine = [
    `${formatMetricNumber(mediaCount)} mídias`,
    `${formatMetricNumber(totalLikes)} curtidas`,
    formatRelativeUpdate(lastUpdatedAt),
  ].join(" • ");

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black tracking-tight text-white sm:text-[1.35rem]">
            {eventName}
          </h1>
          <p className="mt-1 text-sm text-white/50">{statsLine}</p>
        </div>

        <Link
          href={publicPath}
          className="inline-flex shrink-0 min-h-9 items-center justify-center self-start rounded-full border border-white/12 bg-white/[0.06] px-4 text-xs font-bold text-white/85 transition hover:border-white/20 hover:bg-white/10 sm:self-center"
        >
          Abrir galeria
        </Link>
      </div>
    </div>
  );
}

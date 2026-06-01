import { formatMetricNumber } from "@/lib/dashboard/engagement-metrics";

type EventSidebarSummaryProps = {
  mediaCount: number;
  totalLikes: number;
};

export function EventSidebarSummary({
  mediaCount,
  totalLikes,
}: EventSidebarSummaryProps) {
  return (
    <div className="mb-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <p className="flex items-center gap-2 text-xs font-semibold text-white/70">
        <span
          className="size-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
          aria-hidden
        />
        Evento ativo
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-white/45">
        {formatMetricNumber(mediaCount)} mídias
        <span className="text-white/25"> · </span>
        {formatMetricNumber(totalLikes)} curtidas
      </p>
    </div>
  );
}

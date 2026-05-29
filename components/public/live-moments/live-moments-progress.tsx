type LiveMomentsProgressProps = {
  total: number;
  activeIndex: number;
  /** 0–1 progresso do segmento ativo. */
  segmentProgress: number;
};

export function LiveMomentsProgress({
  total,
  activeIndex,
  segmentProgress,
}: LiveMomentsProgressProps) {
  if (total <= 0) {
    return null;
  }

  return (
    <div
      className="flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4"
      aria-hidden
    >
      {Array.from({ length: total }, (_, index) => {
        const fill =
          index < activeIndex
            ? 1
            : index === activeIndex
              ? Math.min(1, Math.max(0, segmentProgress))
              : 0;

        return (
          <div
            key={index}
            className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/20"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-200/95 via-orange-300/90 to-fuchsia-300/85 transition-[width] duration-75 ease-linear"
              style={{ width: `${fill * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

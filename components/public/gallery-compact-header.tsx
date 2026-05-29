"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { routes } from "@/lib/routes";

function AnimatedCount({ count }: { count: number }) {
  const [display, setDisplay] = useState(count);
  const [animating, setAnimating] = useState(false);
  const prevRef = useRef(count);

  useEffect(() => {
    if (prevRef.current === count) {
      return;
    }

    prevRef.current = count;
    setDisplay(count);
    setAnimating(true);

    const timer = window.setTimeout(() => setAnimating(false), 420);

    return () => window.clearTimeout(timer);
  }, [count]);

  return (
    <span
      className={`inline-block tabular-nums ${animating ? "animate-count-pop text-amber-200" : ""}`}
    >
      {display}
    </span>
  );
}

type GalleryCompactHeaderProps = {
  eventName: string;
  mediaCount: number;
  guestUploadSlot?: React.ReactNode;
  compact?: boolean;
};

export function GalleryCompactHeader({
  eventName,
  mediaCount,
  guestUploadSlot,
  compact = false,
}: GalleryCompactHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-30 border-b border-white/8 bg-[#050505]/75 backdrop-blur-2xl ${
        compact
          ? "px-2 py-2"
          : "-mx-5 px-5 py-3 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 2xl:-mx-20 2xl:px-20"
      }`}
    >
      <div
        className={`mx-auto flex max-w-[1900px] items-center gap-2 md:gap-5 ${
          compact ? "max-h-[88px]" : "max-h-[110px] md:max-h-[140px]"
        }`}
      >
        <Link
          href={routes.home}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40 active:scale-[0.98]"
          aria-label="Voltar ao início"
        >
          ←
        </Link>

        <div className="min-w-0 flex-1">
          <h1
            className={`truncate font-black tracking-tight text-white ${
              compact ? "text-lg md:text-xl" : "text-xl md:text-2xl"
            }`}
          >
            {eventName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-emerald-300 md:text-xs">
              <span
                className="size-2 rounded-full bg-emerald-400 animate-live-pulse"
                aria-hidden
              />
              Ao vivo
            </span>
            <span className="text-xs font-semibold text-white/45 md:text-sm">
              <AnimatedCount count={mediaCount} />{" "}
              {mediaCount === 1 ? "mídia" : "mídias"}
            </span>
          </div>
        </div>

        {guestUploadSlot ? (
          <div className="shrink-0">{guestUploadSlot}</div>
        ) : null}
      </div>
    </header>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  pickLiveMomentPreviews,
  resolveLiveMomentPreviewUrl,
  type LiveMomentItem,
  type LiveMomentKind,
} from "@/lib/live-moments/media";

const HERO_CYCLE_MS = 3200;
const HERO_CYCLE_POOL = 6;

type LiveMomentsPreviewCardProps = {
  moments: LiveMomentItem[];
  onOpen: () => void;
};

function PreviewKindBadge({ kind }: { kind: LiveMomentKind }) {
  if (kind === "video") {
    return (
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-[10px] backdrop-blur-sm"
      >
        ▶
      </span>
    );
  }

  if (kind === "boomerang") {
    return (
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-[10px] backdrop-blur-sm"
      >
        ↻
      </span>
    );
  }

  return null;
}

function PreviewTile({
  item,
  className = "",
  priority = false,
}: {
  item: LiveMomentItem | undefined;
  className?: string;
  priority?: boolean;
}) {
  if (!item) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.06] ${className}`}
      />
    );
  }

  const src = resolveLiveMomentPreviewUrl(item);

  return (
    <div
      key={item.id}
      className={`animate-live-moments-preview-fade relative overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-inset ring-white/[0.08] ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="(max-width: 640px) 40vw, 180px"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          priority={priority}
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      <PreviewKindBadge kind={item.kind} />
    </div>
  );
}

function HeroCyclingPreview({
  items,
  className = "",
}: {
  items: LiveMomentItem[];
  className?: string;
}) {
  const pool = useMemo(
    () => items.slice(0, Math.min(HERO_CYCLE_POOL, items.length)),
    [items],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (pool.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % pool.length);
    }, HERO_CYCLE_MS);

    return () => window.clearInterval(timer);
  }, [pool]);

  const active = pool[index] ?? pool[0];

  if (!active) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.06] ${className}`}
      />
    );
  }

  const src = resolveLiveMomentPreviewUrl(active);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-inset ring-white/10 ${className}`}
    >
      {src ? (
        <Image
          key={active.id}
          src={src}
          alt=""
          fill
          sizes="(max-width: 640px) 55vw, 260px"
          className="animate-live-moments-preview-fade object-cover transition duration-700 group-hover:scale-[1.02]"
          priority
          unoptimized
        />
      ) : (
        <div
          key={active.id}
          className="animate-live-moments-preview-fade absolute inset-0 bg-gradient-to-br from-amber-950/40 via-zinc-900 to-fuchsia-950/30"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-white/[0.04]" />
      <PreviewKindBadge kind={active.kind} />
    </div>
  );
}

export function LiveMomentsPreviewCard({
  moments,
  onOpen,
}: LiveMomentsPreviewCardProps) {
  const previews = useMemo(() => pickLiveMomentPreviews(moments), [moments]);
  const [, second, third, fourth] = previews;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-white/[0.04] p-4 text-left shadow-[0_24px_80px_-40px_rgba(251,191,36,0.35)] transition duration-300 hover:border-amber-200/20 hover:shadow-[0_28px_90px_-36px_rgba(251,191,36,0.45)] active:scale-[0.995] sm:p-5"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-amber-400/10 blur-3xl transition duration-500 group-hover:bg-amber-300/15"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-fuchsia-500/10 blur-3xl"
      />

      <span className="relative flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-200">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-red-400 animate-live-moments-live-glow"
          />
          Ao vivo
        </span>
        <span className="text-xs font-semibold text-amber-100/70 transition group-hover:text-amber-50">
          Abrir →
        </span>
      </span>

      <span className="relative mt-3 block">
        <span className="block text-lg font-black tracking-tight text-white sm:text-xl">
          Momentos ao Vivo
        </span>
        <span className="mt-1 block text-sm leading-snug text-white/50">
          Acompanhe o evento em tempo real
        </span>
      </span>

      <span className="relative mt-4 grid h-[7.25rem] grid-cols-4 grid-rows-2 gap-1.5 sm:h-[8.5rem] sm:gap-2">
        <HeroCyclingPreview
          key={moments.map((item) => item.id).join("|")}
          items={moments}
          className="col-span-2 row-span-2 min-h-0"
        />
        <PreviewTile
          item={second}
          className="col-start-3 row-start-1 min-h-0"
        />
        <PreviewTile
          item={third}
          className="col-start-4 row-start-1 min-h-0"
        />
        <PreviewTile
          item={fourth}
          className="col-span-2 col-start-3 row-start-2 min-h-0"
        />
      </span>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
      />
    </button>
  );
}

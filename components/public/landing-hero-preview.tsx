"use client";

import { useEffect, useRef, useState } from "react";

type DemoMedia = {
  id: string;
  gradient: string;
  isVideo?: boolean;
  duration?: string;
  image?: string;
};

const INITIAL_MEDIA: DemoMedia[] = [
  {
    id: "m1",
    gradient: "from-amber-500/50 via-orange-600/40 to-fuchsia-700/50",
    isVideo: true,
    duration: "0:18",
    image: "/guest-uploads/evt_dqhvgkx/guest_6877eec9f1844368ad_thumb.jpg",
  },
  {
    id: "m2",
    gradient: "from-violet-600/45 via-purple-700/40 to-indigo-800/50",
    image: "/guest-uploads/evt_dqhvgkx/guest_2ae3aaf2f9914cf5b5_thumb.jpg",
  },
  {
    id: "m3",
    gradient: "from-rose-500/40 via-amber-500/35 to-orange-600/45",
    isVideo: true,
    duration: "0:24",
    image: "/guest-uploads/evt_dqhvgkx/guest_b4cf6bf8d63247b688.png",
  },
  {
    id: "m4",
    gradient: "from-emerald-600/35 via-teal-700/30 to-cyan-800/40",
    image: "/guest-uploads/evt_dqhvgkx/guest_102d21f38758495dac.png",
  },
];

const INCOMING_MEDIA: DemoMedia[] = [
  {
    id: "m5",
    gradient: "from-fuchsia-500/50 via-purple-600/45 to-violet-800/50",
    isVideo: true,
    duration: "0:12",
    image: "/guest-uploads/evt_dqhvgkx/guest_8b78c2d870dc4e34ba.png",
  },
  {
    id: "m6",
    gradient: "from-yellow-500/45 via-amber-600/40 to-orange-700/50",
    image: "/guest-uploads/evt_dqhvgkx/guest_fb7cd8364bd74d5eb8.png",
  },
];

function PlayIcon() {
  return (
    <span className="ml-0.5 block h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-white" />
  );
}

function DemoCard({
  media,
  isNew = false,
}: {
  media: DemoMedia;
  isNew?: boolean;
}) {
  return (
    <div
      className={`relative h-full min-h-0 overflow-hidden rounded-xl border border-white/10 bg-black/30 ${
        isNew ? "animate-slide-in-media animate-glow-new" : ""
      }`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${media.gradient}`}
      />
      {media.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
      {isNew ? (
        <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-400 px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wider text-slate-950 shadow-lg">
          Novo
        </span>
      ) : null}
      {media.isVideo ? (
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid size-8 place-items-center rounded-full border border-white/30 bg-black/40 backdrop-blur-sm">
            <PlayIcon />
          </span>
        </div>
      ) : null}
      {media.duration ? (
        <span className="absolute bottom-2 right-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.55rem] font-bold text-white/90">
          {media.duration}
        </span>
      ) : null}
    </div>
  );
}

function QrPattern() {
  return (
    <div className="grid grid-cols-5 gap-0.5 p-1">
      {Array.from({ length: 25 }).map((_, index) => (
        <span
          key={index}
          className={`size-2 rounded-[1px] ${
            [0, 1, 2, 4, 5, 6, 10, 12, 14, 18, 20, 22, 23, 24].includes(index)
              ? "bg-white"
              : "bg-white/15"
          }`}
        />
      ))}
    </div>
  );
}

const GRID_SIZE = 4;

export function LandingHeroPreview() {
  const [media, setMedia] = useState<DemoMedia[]>(() =>
    INITIAL_MEDIA.slice(0, GRID_SIZE),
  );
  const [mediaCount, setMediaCount] = useState(1248);
  const [showToast, setShowToast] = useState(false);
  const incomingIndexRef = useRef(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextMedia =
        INCOMING_MEDIA[incomingIndexRef.current % INCOMING_MEDIA.length];

      incomingIndexRef.current += 1;
      setShowToast(true);
      setMediaCount((current) => current + 1);

      window.setTimeout(() => {
        setMedia((current) =>
          [nextMedia, ...current].slice(0, GRID_SIZE),
        );
      }, 600);

      window.setTimeout(() => setShowToast(false), 2800);
    }, 4200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-amber-400/15 via-transparent to-fuchsia-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-400/15"
        style={{ animation: "ring-spin 28s linear infinite" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[105%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/10"
        style={{ animation: "ring-spin 22s linear infinite reverse" }}
      />

      <div className="animate-float-soft absolute -left-2 top-16 z-20 hidden w-[9.5rem] rounded-2xl border border-amber-300/25 bg-black/55 p-3 shadow-[0_20px_60px_rgba(251,191,36,0.18)] backdrop-blur-xl sm:block lg:-left-10">
        <div className="mx-auto w-fit rounded-xl border border-white/15 bg-white p-2">
          <QrPattern />
        </div>
        <p className="mt-2 text-center text-[0.62rem] font-semibold leading-4 text-white/70">
          Escaneie e acesse sua galeria ao vivo
        </p>
      </div>

      {showToast ? (
        <div className="animate-toast-in absolute -right-1 top-8 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-2 shadow-[0_16px_50px_rgba(168,85,247,0.25)] backdrop-blur-xl sm:-right-4 lg:-right-8">
          <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-fuchsia-500 text-xs">
            ⚡
          </span>
          <div>
            <p className="text-[0.65rem] font-black text-white">Novo upload</p>
            <p className="text-[0.58rem] text-white/50">há poucos segundos</p>
          </div>
        </div>
      ) : null}

      <div className="animate-float-soft absolute -right-1 bottom-20 z-20 hidden rounded-2xl border border-white/10 bg-black/50 px-4 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:block lg:-right-6">
        <p className="text-2xl font-black tabular-nums text-white">
          {mediaCount.toLocaleString("pt-BR")}
        </p>
        <p className="text-[0.62rem] font-semibold text-white/50">
          mídias em tempo real
        </p>
      </div>

      <div className="relative mx-auto h-[430px] w-[min(100%,320px)] rounded-[2.4rem] border border-white/15 bg-gradient-to-b from-slate-900/90 to-black p-3 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:h-[460px] sm:w-[340px]">
        <div className="mb-3 flex items-center justify-center">
          <span className="h-1 w-16 rounded-full bg-white/20" />
        </div>

        <div className="flex h-[calc(100%-1.75rem)] flex-col rounded-[1.75rem] border border-white/8 bg-black/40 p-3">
          <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">Party 2026</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.58rem] font-bold text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-live-pulse" />
                  AO VIVO
                </span>
                <span className="text-[0.58rem] font-semibold text-white/45">
                  {mediaCount.toLocaleString("pt-BR")} mídias
                </span>
              </div>
            </div>
            <div className="flex -space-x-2">
              {["A", "B", "C"].map((letter) => (
                <span
                  key={letter}
                  className="grid size-6 place-items-center rounded-full border border-white/15 bg-gradient-to-br from-amber-400/30 to-fuchsia-500/30 text-[0.55rem] font-bold text-white"
                >
                  {letter}
                </span>
              ))}
              <span className="grid size-6 place-items-center rounded-full border border-white/15 bg-black/60 text-[0.5rem] font-bold text-white/70">
                +32
              </span>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 overflow-hidden">
            {media.slice(0, GRID_SIZE).map((item, index) => (
              <DemoCard
                key={index}
                media={item}
                isNew={index === 0 && showToast}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

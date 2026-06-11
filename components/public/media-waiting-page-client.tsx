"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { MediaPublicStatusResponse } from "@/lib/media/media-public-status";

const POLL_INTERVAL_MS = 2000;

type MediaWaitingPageClientProps = {
  mediaId: string;
  initialStatus: MediaPublicStatusResponse;
  /** Desliga polling (ex.: loading.tsx sem id ainda). */
  pollEnabled?: boolean;
};

function resolveWaitingCopy(status: MediaPublicStatusResponse): {
  emoji: string;
  title: string;
  subtext: string;
} {
  if (!status.exists) {
    return {
      emoji: "📸",
      title: "Sua mídia está sendo preparada",
      subtext:
        "Estamos finalizando sua foto ou vídeo. Esta página atualizará automaticamente.",
    };
  }

  if (!status.ready && status.reviewStatus === "pending") {
    return {
      emoji: "⏳",
      title: "Aguardando aprovação",
      subtext:
        "Sua mídia foi enviada com sucesso. Aguardando aprovação do organizador.",
    };
  }

  if (!status.ready && status.reviewStatus === "rejected") {
    return {
      emoji: "🔒",
      title: "Mídia indisponível",
      subtext:
        "Esta mídia não está disponível para visualização pública no momento.",
    };
  }

  return {
    emoji: "📸",
    title: "Sua mídia está sendo preparada",
    subtext:
      "Estamos finalizando sua foto ou vídeo. Esta página atualizará automaticamente.",
  };
}

function MidiaUpMark() {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 via-orange-400 to-fuchsia-500 text-2xl font-black text-slate-950 shadow-[0_16px_48px_rgba(251,191,36,0.28)]">
        M
      </span>
      <span className="text-sm font-bold uppercase tracking-[0.28em] text-amber-200/90">
        MidiaUp
      </span>
    </div>
  );
}

export function MediaWaitingPageClient({
  mediaId,
  initialStatus,
  pollEnabled = true,
}: MediaWaitingPageClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const copy = resolveWaitingCopy(status);

  useEffect(() => {
    if (status.ready) {
      router.refresh();
    }
  }, [status.ready, router]);

  useEffect(() => {
    if (!pollEnabled || !mediaId.trim() || initialStatus.ready) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/media/${encodeURIComponent(mediaId)}/status`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as MediaPublicStatusResponse;

        if (!cancelled) {
          setStatus(payload);
        }
      } catch (error) {
        console.warn("[MediaWaitingPage] falha ao consultar status", error);
      }
    };

    void poll();

    const intervalId = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [initialStatus.ready, mediaId, pollEnabled]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(192,38,211,0.16),transparent_34%),linear-gradient(180deg,#050505_0%,#0b1020_52%,#040506_100%)]"
        aria-hidden
      />

      <div className="animate-rise flex w-full max-w-lg flex-col items-center gap-8 rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-10 sm:py-12">
        <MidiaUpMark />

        <div className="space-y-4">
          <p className="text-4xl" aria-hidden>
            {copy.emoji}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
            {copy.title}
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-white/72 sm:text-base">
            {copy.subtext}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4" aria-live="polite">
          <div className="relative size-16" aria-hidden>
            <span className="absolute inset-0 rounded-full border border-amber-300/15" />
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-300 border-r-fuchsia-400/70 animate-spin" />
            <span className="absolute inset-[18px] rounded-full bg-amber-300/10 blur-md" />
          </div>

          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
            <div className="animate-media-wait-indeterminate h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
          </div>

          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/45">
            Atualizando automaticamente
          </p>
        </div>
      </div>
    </div>
  );
}

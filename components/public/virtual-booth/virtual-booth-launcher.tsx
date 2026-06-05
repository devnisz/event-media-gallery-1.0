"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import {
  shouldShowCabineVirtualLauncher,
  type CabineVirtualEventConfig,
} from "@/lib/virtual-booth/event-config";
import { VirtualBoothModal } from "./virtual-booth-modal";

type VirtualBoothLauncherProps = {
  eventId?: string;
  eventSlug: string;
  allowGuestUpload: boolean;
  frameUrl?: string;
  cabineConfig: CabineVirtualEventConfig;
};

/**
 * Cabine Virtual — captura, moldura e publicação via fluxo de upload de convidado.
 * Componente isolado: remova este import e o uso em `video-gallery.tsx` para desativar.
 */
export function VirtualBoothLauncher({
  eventId,
  eventSlug,
  allowGuestUpload,
  frameUrl = "",
  cabineConfig,
}: VirtualBoothLauncherProps) {
  const [open, setOpen] = useState(false);

  if (
    !allowGuestUpload ||
    !eventId?.trim() ||
    !shouldShowCabineVirtualLauncher(cabineConfig)
  ) {
    return null;
  }

  return (
    <>
      <div
        className="pointer-events-none h-20 shrink-0 sm:h-24"
        aria-hidden
      />
      <VirtualBoothModal
        open={open}
        eventId={eventId}
        eventSlug={eventSlug}
        allowGuestUpload={allowGuestUpload}
        frameUrl={frameUrl}
        cabineConfig={cabineConfig}
        onClose={() => setOpen(false)}
      />

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40 inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-full border border-white/[0.12] bg-neutral-950/88 px-5 py-3 text-sm font-medium tracking-[-0.01em] text-white/92 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-white/20 hover:bg-neutral-900/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 active:scale-[0.98] sm:bottom-8 sm:right-8 sm:min-h-14 sm:px-6 sm:text-[0.9375rem]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Sparkles className="size-[1.05rem] text-white/75" strokeWidth={1.5} />
        <span>Cabine Virtual</span>
      </button>
    </>
  );
}

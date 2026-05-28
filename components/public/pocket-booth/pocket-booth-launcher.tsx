"use client";

import { useState } from "react";
import { PocketBoothModal } from "./pocket-booth-modal";

type PocketBoothLauncherProps = {
  eventId?: string;
  allowGuestUpload: boolean;
};

/**
 * Cabine de Bolso — captura e publicação via fluxo de upload de convidado.
 * Componente isolado: remova este import e o uso em `video-gallery.tsx` para desativar.
 */
export function PocketBoothLauncher({
  eventId,
  allowGuestUpload,
}: PocketBoothLauncherProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="pointer-events-none h-20 shrink-0 sm:h-24"
        aria-hidden
      />
      <PocketBoothModal
        open={open}
        eventId={eventId}
        allowGuestUpload={allowGuestUpload}
        onClose={() => setOpen(false)}
      />

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_60px_rgba(251,191,36,0.35)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40 active:scale-[0.98] sm:bottom-8 sm:right-8 sm:min-h-14 sm:px-6 sm:text-base"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span aria-hidden className="text-base sm:text-lg">
          📸
        </span>
        <span>Criar mídia</span>
      </button>
    </>
  );
}

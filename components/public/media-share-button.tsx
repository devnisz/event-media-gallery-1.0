"use client";

import { useState } from "react";

import {
  buildMediaSharePayload,
  shareMediaLink,
} from "@/lib/share/media-share";
import type { MediaKind } from "@/types/media";

type MediaShareButtonProps = {
  mediaId: string;
  mediaType: MediaKind;
  allowMediaShare: boolean;
  variant?: "icon" | "pill";
};

export function MediaShareButton({
  mediaId,
  mediaType,
  allowMediaShare,
  variant = "icon",
}: MediaShareButtonProps) {
  const [toast, setToast] = useState("");

  if (!allowMediaShare) {
    return null;
  }

  async function handleShare() {
    setToast("");

    const payload = buildMediaSharePayload(mediaId, mediaType);
    const outcome = await shareMediaLink(payload);

    if (outcome === "copied") {
      setToast("✅ Link copiado");
      window.setTimeout(() => setToast(""), 2600);
      return;
    }

    if (outcome === "failed") {
      setToast("Não foi possível compartilhar.");
      window.setTimeout(() => setToast(""), 2600);
    }
  }

  const isIcon = variant === "icon";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Compartilhar"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void handleShare();
        }}
        className={
          isIcon
            ? "grid size-11 place-items-center rounded-full bg-black/35 text-lg text-white/90 backdrop-blur-md transition hover:bg-black/50 active:scale-95 sm:size-12"
            : "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 active:scale-95"
        }
      >
        <span aria-hidden>↗</span>
        {!isIcon ? <span>Compartilhar</span> : null}
      </button>
      {toast ? (
        <p
          role="status"
          className={`pointer-events-none absolute z-40 whitespace-nowrap rounded-full bg-black/80 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md ${
            isIcon
              ? "bottom-full right-0 mb-2"
              : "left-1/2 top-full mt-2 -translate-x-1/2"
          }`}
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}

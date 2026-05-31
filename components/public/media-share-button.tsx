"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

import {
  mediaGlassActionButtonClass,
  mediaGlassActionIconClass,
} from "@/components/public/media-glass-action-styles";
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
  fullWidth?: boolean;
};

export function MediaShareButton({
  mediaId,
  mediaType,
  allowMediaShare,
  variant = "icon",
  fullWidth = false,
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
      setToast("Link copiado");
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
            ? mediaGlassActionButtonClass
            : fullWidth
              ? "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-base font-black text-slate-950 shadow-[0_18px_60px_rgba(255,255,255,0.18)] transition duration-300 hover:scale-[1.02] hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/50 active:scale-[0.98] sm:min-h-[3.25rem]"
              : "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 active:scale-95"
        }
      >
        {isIcon ? (
          <Share2 aria-hidden className={mediaGlassActionIconClass} />
        ) : (
          <>
            <Share2 aria-hidden className="size-4 stroke-[1.75]" />
            <span>Compartilhar</span>
          </>
        )}
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

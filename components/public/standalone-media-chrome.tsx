"use client";

import { MoreVertical } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DownloadButton } from "@/components/public/download-button";
import {
  mediaGlassActionButtonClass,
  mediaGlassActionIconClass,
} from "@/components/public/media-glass-action-styles";
import { MediaLikeButton } from "@/components/public/media-like-button";
import { MediaShareButton } from "@/components/public/media-share-button";
import { PublicMediaDeleteButton } from "@/components/public/public-media-delete-button";
import type { EventMedia } from "@/types/media";

export type StandaloneMediaChromeProps = {
  media: EventMedia;
  eventHref: string;
  allowLikes: boolean;
  allowMediaShare: boolean;
  downloadHref: string;
  downloadFileName: string;
};

export function StandaloneMediaChrome({
  media,
  eventHref,
  allowLikes,
  allowMediaShare,
  downloadHref,
  downloadFileName,
}: StandaloneMediaChromeProps) {
  const showDeleteMenu = media.allowPublicDelete === true;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setMenuOpen(false);
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  return (
    <>
      <Link
        href={eventHref}
        className="absolute left-3 top-3 z-30 inline-flex min-h-9 items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-[13px] font-semibold text-white/92 shadow-sm backdrop-blur-md transition hover:bg-black/55 active:scale-[0.98]"
      >
        <span aria-hidden>←</span>
        Galeria
      </Link>

      {showDeleteMenu ? (
        <div ref={menuRef} className="absolute right-3 top-3 z-30">
          <button
            type="button"
            aria-label="Mais opções"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
            className={mediaGlassActionButtonClass}
          >
            <MoreVertical aria-hidden className={mediaGlassActionIconClass} />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-40 min-w-[12.5rem] overflow-hidden rounded-2xl border border-white/10 bg-black/75 py-1 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            >
              <PublicMediaDeleteButton
                mediaId={media.id}
                title={media.title}
                eventHref={eventHref}
                requireDeletePin={media.requireDeletePin}
                appearance="menu"
                onMenuAction={() => setMenuOpen(false)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2">
        {allowMediaShare ? (
          <MediaShareButton
            mediaId={media.id}
            mediaType={media.mediaType}
            allowMediaShare={allowMediaShare}
            variant="icon"
          />
        ) : null}
        <DownloadButton
          href={downloadHref}
          fileName={downloadFileName}
          variant="icon"
        />
      </div>

      {allowLikes ? (
        <div className="absolute bottom-3 right-3 z-30">
          <MediaLikeButton
            mediaId={media.id}
            initialCount={media.likesCount ?? 0}
            allowLikes={allowLikes}
            variant="icon"
          />
        </div>
      ) : null}
    </>
  );
}

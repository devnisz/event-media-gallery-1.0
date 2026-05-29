"use client";

import { useEffect, useState } from "react";

import { VideoCard } from "@/components/public/video-card";
import type { GalleryGridSharedProps } from "./types";

export function PremiumGalleryGrid({
  videos,
  newMediaIds,
  removingIds,
  allowPublicDelete,
  requireDeletePin,
  onDeleted,
}: GalleryGridSharedProps) {
  const [mobileTwoCols, setMobileTwoCols] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return window.localStorage.getItem("gallery-mobile-two-cols") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "gallery-mobile-two-cols",
        mobileTwoCols ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }, [mobileTwoCols]);

  return (
    <div
      className={`flex flex-col ${mobileTwoCols ? "gap-2 md:gap-4" : "gap-3 md:gap-4"}`}
    >
      <div className="flex flex-wrap items-center justify-end gap-3 md:hidden">
        <div
          className="inline-flex rounded-full border border-white/10 bg-black/30 p-0.5"
          role="group"
          aria-label="Número de colunas no celular"
        >
          <button
            type="button"
            aria-pressed={!mobileTwoCols}
            onClick={() => setMobileTwoCols(false)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              !mobileTwoCols
                ? "bg-white text-slate-950 shadow"
                : "text-white/60 hover:text-white"
            }`}
          >
            1 col
          </button>
          <button
            type="button"
            aria-pressed={mobileTwoCols}
            onClick={() => setMobileTwoCols(true)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              mobileTwoCols
                ? "bg-white text-slate-950 shadow"
                : "text-white/60 hover:text-white"
            }`}
          >
            2 cols
          </button>
        </div>
      </div>

      <div
        className={`grid min-w-0 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
          mobileTwoCols
            ? "grid-cols-2 gap-2 md:gap-5"
            : "grid-cols-2 gap-3 sm:gap-4 md:gap-5"
        }`}
      >
        {videos.map((video, index) => (
          <VideoCard
            key={video.id}
            video={video}
            index={index}
            isNew={newMediaIds.has(video.id)}
            isRemoving={removingIds.has(video.id)}
            onDeleted={onDeleted}
            compactMobileTwoCol={mobileTwoCols}
            allowPublicDelete={allowPublicDelete}
            requireDeletePin={requireDeletePin}
            hideEventLabel
          />
        ))}
      </div>
    </div>
  );
}

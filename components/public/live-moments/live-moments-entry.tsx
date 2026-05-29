"use client";

import { useMemo, useState } from "react";

import type { LiveMomentsSortOrder } from "@/lib/live-moments/config";
import { buildLiveMomentsFromGalleryMedia } from "@/lib/live-moments/media";
import type { EventMedia } from "@/types/media";
import { LiveMomentsViewer } from "./live-moments-viewer";

type LiveMomentsEntryProps = {
  media: EventMedia[];
  sortOrder?: LiveMomentsSortOrder;
};

export function LiveMomentsEntry({
  media,
  sortOrder = "newest-first",
}: LiveMomentsEntryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);

  const moments = useMemo(
    () => buildLiveMomentsFromGalleryMedia(media, sortOrder),
    [media, sortOrder],
  );

  if (moments.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-left transition duration-300 hover:border-white/15 hover:bg-white/[0.05] active:scale-[0.995] sm:px-5"
        >
          <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300/25 via-orange-400/20 to-fuchsia-500/25 ring-2 ring-amber-200/35 ring-offset-2 ring-offset-transparent transition group-hover:ring-amber-200/55 sm:size-16">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300/10 to-fuchsia-400/10 blur-md"
            />
            <span className="relative text-xl sm:text-2xl">✨</span>
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black tracking-tight text-white sm:text-base">
              Momentos ao Vivo
            </span>
            <span className="mt-0.5 block text-xs text-white/45 sm:text-sm">
              {moments.length}{" "}
              {moments.length === 1 ? "momento" : "momentos"} do evento
            </span>
          </span>

          <span className="shrink-0 text-sm font-semibold text-amber-100/80 transition group-hover:text-amber-100">
            Ver tudo →
          </span>
        </button>
      </div>

      {viewerOpen ? (
        <LiveMomentsViewer
          items={moments}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}
    </>
  );
}

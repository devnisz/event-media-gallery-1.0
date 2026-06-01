"use client";

import { useEffect } from "react";

import { clearGalleryOpenPreview, getGalleryOpenPreview } from "@/lib/gallery/gallery-open-preview";

export function VideoPageLoadingShell() {
  const preview = getGalleryOpenPreview();

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-2 py-2 text-white sm:px-3 sm:py-3">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[#050505]" aria-hidden />

      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="pointer-events-none absolute left-3 top-3 z-30 inline-flex min-h-9 items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-[13px] font-semibold text-white/92 backdrop-blur-md">
            <span aria-hidden>←</span>
            Galeria
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center px-2">
            {preview?.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.thumbnailUrl}
                alt=""
                className="max-h-[min(90dvh,calc(100dvh-1rem))] w-auto max-w-[min(100vw-1rem,600px)] rounded-xl object-contain opacity-90 blur-[1px] sm:rounded-2xl"
              />
            ) : (
              <div className="aspect-[9/16] h-[min(72dvh,720px)] w-auto max-w-[min(100vw-1rem,420px)] animate-pulse rounded-xl bg-white/[0.06] sm:rounded-2xl" />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export function VideoPageClearOpenPreview() {
  useEffect(() => {
    clearGalleryOpenPreview();
  }, []);

  return null;
}

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  formatLiveMomentTime,
  getLiveMomentIcon,
  getLiveMomentLabel,
  type LiveMomentItem,
} from "@/lib/live-moments/media";
import { MediaLikeButton } from "@/components/public/media-like-button";
import { LiveMomentsMedia } from "./live-moments-media";
import { LiveMomentsProgress } from "./live-moments-progress";

type LiveMomentsViewerProps = {
  items: LiveMomentItem[];
  initialIndex?: number;
  allowLikes?: boolean;
  onLikeCountChange?: (
    mediaId: string,
    likesCount: number,
    liked: boolean,
  ) => void;
  onClose: () => void;
};

function preloadMoment(item: LiveMomentItem) {
  if (item.kind === "video") {
    const video = document.createElement("video");
    video.preload = "auto";
    video.src = item.url;
    return;
  }

  const image = new Image();
  image.src = item.url;
}

export function LiveMomentsViewer({
  items,
  initialIndex = 0,
  allowLikes = false,
  onLikeCountChange,
  onClose,
}: LiveMomentsViewerProps) {
  const [index, setIndex] = useState(
    () => Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1)),
  );
  const [segmentProgress, setSegmentProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);

  const clampedIndex = Math.min(
    index,
    Math.max(0, items.length - 1),
  );
  const current = items[clampedIndex];

  const goNext = useCallback(() => {
    setSegmentProgress(0);

    if (clampedIndex >= items.length - 1) {
      onClose();
      return;
    }

    setIndex((value) => value + 1);
  }, [clampedIndex, items.length, onClose]);

  const goPrev = useCallback(() => {
    setSegmentProgress(0);

    if (clampedIndex <= 0) {
      return;
    }

    setIndex((value) => value - 1);
  }, [clampedIndex]);

  useEffect(() => {
    const previous = items[index - 1];
    const next = items[index + 1];

    if (previous) {
      preloadMoment(previous);
    }

    if (next) {
      preloadMoment(next);
    }

    if (current) {
      preloadMoment(current);
    }
  }, [index, items, current]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowRight") {
        goNext();
      }

      if (event.key === "ArrowLeft") {
        goPrev();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!current) {
    return null;
  }

  const timeLabel = formatLiveMomentTime(current.occurredAt);

  return (
    <div
      className="fixed inset-0 z-[70] flex animate-live-moments-open flex-col bg-black/98 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Momentos ao Vivo"
    >
      <LiveMomentsProgress
        total={items.length}
        activeIndex={clampedIndex}
        segmentProgress={segmentProgress}
      />

      <div
        className="relative flex min-h-0 flex-1 flex-col"
        onPointerDown={() => {
          holdTimerRef.current = window.setTimeout(() => {
            setPaused(true);
          }, 180);
        }}
        onPointerUp={() => {
          if (holdTimerRef.current !== null) {
            window.clearTimeout(holdTimerRef.current);
          }

          setPaused(false);
        }}
        onPointerLeave={() => {
          if (holdTimerRef.current !== null) {
            window.clearTimeout(holdTimerRef.current);
          }

          setPaused(false);
        }}
        onTouchStart={(event) => {
          touchStartYRef.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchMove={(event) => {
          const startY = touchStartYRef.current;

          if (startY === null) {
            return;
          }

          const deltaY = (event.touches[0]?.clientY ?? startY) - startY;

          if (deltaY > 72) {
            onClose();
          }
        }}
        onTouchEnd={() => {
          touchStartYRef.current = null;
        }}
      >
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="absolute right-3 top-2 z-20 grid size-10 place-items-center rounded-full bg-black/35 text-lg text-white/70 backdrop-blur-sm transition hover:text-white sm:right-4"
        >
          ×
        </button>

        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 pb-6 pt-2">
          <button
            type="button"
            aria-label="Anterior"
            className="absolute inset-y-0 left-0 z-20 w-[38%] cursor-pointer bg-transparent"
            onClick={goPrev}
          />
          <button
            type="button"
            aria-label="Próximo"
            className="absolute inset-y-0 right-0 z-20 w-[38%] cursor-pointer bg-transparent"
            onClick={goNext}
          />

          <div className="pointer-events-none relative z-10 flex max-h-[78dvh] w-full max-w-3xl items-center justify-center">
            <LiveMomentsMedia
              item={current}
              paused={paused}
              onProgress={setSegmentProgress}
              onSegmentEnd={goNext}
            />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <p className="pointer-events-none text-sm font-semibold text-white/90">
            <span aria-hidden className="mr-1.5">
              {getLiveMomentIcon(current.kind)}
            </span>
            {getLiveMomentLabel(current.kind)}
          </p>
          <div className="flex items-center gap-3">
            {allowLikes ? (
              <MediaLikeButton
                key={`${current.id}-${current.likesCount}`}
                mediaId={current.id}
                initialCount={current.likesCount}
                allowLikes={allowLikes}
                variant="overlay"
                onCountChange={onLikeCountChange}
              />
            ) : null}
            {timeLabel ? (
              <p className="pointer-events-none text-xs font-medium text-white/45">
                {timeLabel}
              </p>
            ) : (
              <span className="pointer-events-none text-xs text-white/30">
                {clampedIndex + 1} / {items.length}
              </span>
            )}
          </div>
        </div>

        {paused ? (
          <p className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
            Pausado
          </p>
        ) : null}
      </div>
    </div>
  );
}

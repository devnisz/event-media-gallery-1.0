"use client";

import { useEffect, useRef } from "react";

import {
  getLiveMomentStaticDurationMs,
  type LiveMomentItem,
} from "@/lib/live-moments/media";

type LiveMomentsMediaProps = {
  item: LiveMomentItem;
  paused: boolean;
  onProgress: (value: number) => void;
  onSegmentEnd: () => void;
};

export function LiveMomentsMedia({
  item,
  paused,
  onProgress,
  onSegmentEnd,
}: LiveMomentsMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const elapsedBeforePauseRef = useRef(0);

  useEffect(() => {
    if (item.kind === "video") {
      return;
    }

    const durationMs = getLiveMomentStaticDurationMs(item.kind);

    const tick = () => {
      if (paused) {
        return;
      }

      const elapsed = elapsedBeforePauseRef.current + (performance.now() - startedAtRef.current);
      const progress = Math.min(1, elapsed / durationMs);

      onProgress(progress);

      if (progress >= 1) {
        onSegmentEnd();
        return;
      }

      timerRef.current = window.requestAnimationFrame(tick);
    };

    if (!paused) {
      startedAtRef.current = performance.now();
      timerRef.current = window.requestAnimationFrame(tick);
    }

    return () => {
      if (timerRef.current !== null) {
        window.cancelAnimationFrame(timerRef.current);
      }
    };
  }, [item, paused, onProgress, onSegmentEnd]);

  useEffect(() => {
    if (paused && item.kind !== "video") {
      elapsedBeforePauseRef.current +=
        performance.now() - startedAtRef.current;
    }
  }, [paused, item.kind]);

  useEffect(() => {
    elapsedBeforePauseRef.current = 0;
    startedAtRef.current = performance.now();
    onProgress(0);
  }, [item.id, onProgress]);

  useEffect(() => {
    const video = videoRef.current;

    if (item.kind !== "video" || !video) {
      return;
    }

    video.currentTime = 0;

    if (paused) {
      video.pause();
      return;
    }

    void video.play().catch(() => {
      onSegmentEnd();
    });
  }, [item.id, item.kind, paused, onSegmentEnd]);

  if (item.kind === "video") {
    return (
      <video
        ref={videoRef}
        key={item.id}
        src={item.url}
        className="max-h-full max-w-full object-contain"
        playsInline
        muted
        preload="auto"
        onTimeUpdate={(event) => {
          const element = event.currentTarget;
          const duration = element.duration;

          if (!Number.isFinite(duration) || duration <= 0) {
            return;
          }

          onProgress(Math.min(1, element.currentTime / duration));
        }}
        onEnded={onSegmentEnd}
        onError={onSegmentEnd}
      />
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      key={item.id}
      src={item.url}
      alt=""
      className="max-h-full max-w-full object-contain"
      draggable={false}
    />
  );
}

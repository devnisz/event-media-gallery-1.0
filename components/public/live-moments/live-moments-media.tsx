"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  getLiveMomentStaticDurationMs,
  type LiveMomentItem,
} from "@/lib/live-moments/media";
import {
  playVideoWithSoundPreference,
  unmuteVideoElement,
} from "@/lib/gallery/video-playback";

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
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);

  useEffect(() => {
    setShowUnmuteHint(false);
  }, [item.id]);

  useEffect(() => {
    if (item.kind === "video") {
      return;
    }

    const durationMs = getLiveMomentStaticDurationMs(item.kind);

    const tick = () => {
      if (paused) {
        return;
      }

      const elapsed =
        elapsedBeforePauseRef.current +
        (performance.now() - startedAtRef.current);
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
    setShowUnmuteHint(false);

    if (paused) {
      video.pause();
      return;
    }

    let cancelled = false;

    void playVideoWithSoundPreference(video)
      .then((mode) => {
        if (!cancelled) {
          setShowUnmuteHint(mode === "muted");
        }
      })
      .catch(() => {
        onSegmentEnd();
      });

    return () => {
      cancelled = true;
    };
  }, [item.id, item.kind, paused, onSegmentEnd]);

  if (item.kind === "video") {
    return (
      <div className="relative flex max-h-full max-w-full items-center justify-center">
        <video
          ref={videoRef}
          key={item.id}
          src={item.url}
          className="max-h-full max-w-full object-contain"
          playsInline
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
        {showUnmuteHint ? (
          <button
            type="button"
            onClick={() => {
              const video = videoRef.current;

              if (!video) {
                return;
              }

              unmuteVideoElement(video);
              setShowUnmuteHint(false);
            }}
            className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-3.5 py-2 text-xs font-semibold text-white/95 backdrop-blur-sm transition hover:bg-black/70"
            aria-label="Ativar som do vídeo"
          >
            <Volume2 className="size-3.5" strokeWidth={1.75} aria-hidden />
            Ativar som
          </button>
        ) : null}
      </div>
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

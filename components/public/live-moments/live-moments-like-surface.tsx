"use client";

import {
  useCallback,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import { formatLikeCount } from "@/lib/likes/format";
import { toggleMediaLikeClient } from "@/lib/likes/toggle-client";
import {
  isMediaLikedLocally,
  setMediaLikedLocally,
} from "@/lib/likes/visitor-client";

const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_MAX_DISTANCE_PX = 48;
const COUNT_FLASH_MS = 2400;

type LiveMomentsLikeSurfaceProps = {
  mediaId: string;
  initialCount: number;
  onCountChange?: (mediaId: string, likesCount: number, liked: boolean) => void;
  children: ReactNode;
};

export function LiveMomentsLikeSurface({
  mediaId,
  initialCount,
  onCountChange,
  children,
}: LiveMomentsLikeSurfaceProps) {
  const [likesCount, setLikesCount] = useState(Math.max(0, initialCount));
  const [liked, setLiked] = useState(() => isMediaLikedLocally(mediaId));
  const [isPending, setIsPending] = useState(false);
  const [heartPop, setHeartPop] = useState(false);
  const [burstVisible, setBurstVisible] = useState(false);
  const [countFlashVisible, setCountFlashVisible] = useState(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(
    null,
  );
  const countFlashTimerRef = useRef<number | null>(null);
  const displayCount = Math.max(likesCount, Math.max(0, initialCount));

  const flashCount = useCallback(() => {
    setCountFlashVisible(true);

    if (countFlashTimerRef.current !== null) {
      window.clearTimeout(countFlashTimerRef.current);
    }

    countFlashTimerRef.current = window.setTimeout(() => {
      setCountFlashVisible(false);
      countFlashTimerRef.current = null;
    }, COUNT_FLASH_MS);
  }, []);

  const triggerBurst = useCallback(() => {
    setBurstVisible(true);
    window.setTimeout(() => setBurstVisible(false), 720);
  }, []);

  const applyLikeState = useCallback(
    (nextLiked: boolean, nextCount: number) => {
      setLiked(nextLiked);
      setLikesCount(nextCount);
      setMediaLikedLocally(mediaId, nextLiked);
      onCountChange?.(mediaId, nextCount, nextLiked);
    },
    [mediaId, onCountChange],
  );

  const performToggle = useCallback(
    async (options?: { preferLike?: boolean; showBurst?: boolean }) => {
      if (isPending) {
        return;
      }

      if (options?.preferLike && liked) {
        if (options.showBurst) {
          triggerBurst();
        }

        flashCount();
        return;
      }

      setIsPending(true);
      setHeartPop(true);

      const previousLiked = liked;
      const previousCount = likesCount;
      const optimisticLiked = options?.preferLike ? true : !liked;
      const optimisticCount = Math.max(
        0,
        optimisticLiked ? likesCount + (liked ? 0 : 1) : likesCount - 1,
      );

      applyLikeState(optimisticLiked, optimisticCount);

      if (options?.showBurst && optimisticLiked) {
        triggerBurst();
      }

      if (optimisticLiked !== previousLiked || optimisticCount !== previousCount) {
        flashCount();
      }

      try {
        const result = await toggleMediaLikeClient(mediaId);
        applyLikeState(result.liked, result.likesCount);

        if (result.liked && options?.showBurst) {
          triggerBurst();
        }
      } catch {
        applyLikeState(previousLiked, previousCount);
      } finally {
        setIsPending(false);
        window.setTimeout(() => setHeartPop(false), 420);
      }
    },
    [
      applyLikeState,
      flashCount,
      isPending,
      liked,
      likesCount,
      mediaId,
      triggerBurst,
    ],
  );

  function handleHeartClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    void performToggle({ showBurst: !liked });
  }

  function handleMediaPointerUp(event: MouseEvent<HTMLDivElement>) {
    if (isPending) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest("[data-live-moments-like-control]")) {
      return;
    }

    const now = Date.now();
    const x = event.clientX;
    const y = event.clientY;
    const last = lastTapRef.current;

    if (
      last &&
      now - last.time <= DOUBLE_TAP_MS &&
      Math.hypot(x - last.x, y - last.y) <= DOUBLE_TAP_MAX_DISTANCE_PX
    ) {
      lastTapRef.current = null;
      void performToggle({ preferLike: true, showBurst: true });
      return;
    }

    lastTapRef.current = { time: now, x, y };
  }

  return (
    <div
      className="relative flex max-h-[78dvh] w-full max-w-3xl items-center justify-center"
      onPointerUp={handleMediaPointerUp}
    >
      <div className="pointer-events-none relative z-10 flex max-h-[78dvh] w-full max-w-3xl items-center justify-center">
        {children}
      </div>

      {burstVisible ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-[5.5rem] leading-none sm:text-[7rem] animate-live-moments-heart-burst"
        >
          ❤️
        </span>
      ) : null}

      {countFlashVisible ? (
        <p
          aria-live="polite"
          className="pointer-events-none absolute bottom-16 right-3 z-30 rounded-full bg-black/45 px-3 py-1.5 text-sm font-semibold text-white/95 backdrop-blur-md animate-live-moments-like-count-flash sm:right-4"
        >
          <span aria-hidden className="mr-1">
            ❤️
          </span>
          <span className="tabular-nums">{formatLikeCount(displayCount)}</span>
        </p>
      ) : null}

      <button
        type="button"
        data-live-moments-like-control
        aria-label={liked ? "Descurtir" : "Curtir"}
        aria-pressed={liked}
        disabled={isPending}
        onClick={(event) => void handleHeartClick(event)}
        className="absolute bottom-3 right-3 z-30 grid size-11 place-items-center rounded-full bg-black/35 text-xl backdrop-blur-md transition hover:bg-black/50 active:scale-95 disabled:opacity-60 sm:bottom-4 sm:right-4 sm:size-12 sm:text-2xl"
      >
        <span
          aria-hidden
          className={`leading-none transition duration-300 ${
            heartPop ? "animate-media-like-pop" : ""
          }`}
        >
          {liked ? "❤️" : "🤍"}
        </span>
      </button>
    </div>
  );
}

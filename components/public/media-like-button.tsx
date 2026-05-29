"use client";

import { useState, type MouseEvent } from "react";

import {
  getOrCreateVisitorKey,
  isMediaLikedLocally,
  setMediaLikedLocally,
} from "@/lib/likes/visitor-client";

type MediaLikeButtonProps = {
  mediaId: string;
  initialCount: number;
  allowLikes: boolean;
  variant?: "tile" | "overlay";
  onCountChange?: (mediaId: string, likesCount: number, liked: boolean) => void;
};

function formatLikeCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (count >= 10_000) {
    return `${Math.round(count / 1000)}k`;
  }

  if (count >= 1_000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(count);
}

export function MediaLikeButton({
  mediaId,
  initialCount,
  allowLikes,
  variant = "tile",
  onCountChange,
}: MediaLikeButtonProps) {
  const [likesCount, setLikesCount] = useState(Math.max(0, initialCount));
  const [liked, setLiked] = useState(() => isMediaLikedLocally(mediaId));
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPending, setIsPending] = useState(false);

  if (!allowLikes) {
    return null;
  }

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isPending) {
      return;
    }

    setIsPending(true);
    setIsAnimating(true);

    const visitorKey = getOrCreateVisitorKey();
    const previousLiked = liked;
    const previousCount = likesCount;
    const optimisticLiked = !liked;
    const optimisticCount = Math.max(
      0,
      likesCount + (optimisticLiked ? 1 : -1),
    );

    setLiked(optimisticLiked);
    setLikesCount(optimisticCount);
    setMediaLikedLocally(mediaId, optimisticLiked);
    onCountChange?.(mediaId, optimisticCount, optimisticLiked);

    try {
      const response = await fetch(
        `/api/media/${encodeURIComponent(mediaId)}/like`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorKey }),
        },
      );
      const payload = (await response.json()) as {
        error?: string;
        liked?: boolean;
        likesCount?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível curtir.");
      }

      const nextLiked = payload.liked === true;
      const nextCount =
        typeof payload.likesCount === "number"
          ? Math.max(0, payload.likesCount)
          : optimisticCount;

      setLiked(nextLiked);
      setLikesCount(nextCount);
      setMediaLikedLocally(mediaId, nextLiked);
      onCountChange?.(mediaId, nextCount, nextLiked);
    } catch {
      setLiked(previousLiked);
      setLikesCount(previousCount);
      setMediaLikedLocally(mediaId, previousLiked);
      onCountChange?.(mediaId, previousCount, previousLiked);
    } finally {
      setIsPending(false);
      window.setTimeout(() => setIsAnimating(false), 420);
    }
  }

  const isOverlay = variant === "overlay";

  return (
    <button
      type="button"
      aria-label={liked ? "Descurtir" : "Curtir"}
      aria-pressed={liked}
      disabled={isPending}
      onClick={(event) => void handleClick(event)}
      className={
        isOverlay
          ? "inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm font-semibold text-white/90 backdrop-blur-md transition hover:bg-black/55 disabled:opacity-60"
          : "inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-60"
      }
    >
      <span
        aria-hidden
        className={`leading-none transition duration-300 ${
          isAnimating ? "animate-media-like-pop" : ""
        } ${liked ? "scale-110" : "scale-100"}`}
      >
        {liked ? "❤️" : "🤍"}
      </span>
      <span className="tabular-nums">{formatLikeCount(likesCount)}</span>
    </button>
  );
}

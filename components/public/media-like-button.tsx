"use client";

import { useState, type MouseEvent } from "react";

import { formatLikeCount } from "@/lib/likes/format";
import { toggleMediaLikeClient } from "@/lib/likes/toggle-client";
import { isMediaLikedLocally } from "@/lib/likes/visitor-client";

type MediaLikeButtonProps = {
  mediaId: string;
  initialCount: number;
  allowLikes: boolean;
  variant?: "tile" | "overlay" | "icon";
  onCountChange?: (mediaId: string, likesCount: number, liked: boolean) => void;
};

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

    const previousLiked = liked;
    const previousCount = likesCount;
    const optimisticLiked = !liked;
    const optimisticCount = Math.max(
      0,
      likesCount + (optimisticLiked ? 1 : -1),
    );

    setLiked(optimisticLiked);
    setLikesCount(optimisticCount);
    onCountChange?.(mediaId, optimisticCount, optimisticLiked);

    try {
      const result = await toggleMediaLikeClient(mediaId);

      setLiked(result.liked);
      setLikesCount(result.likesCount);
      onCountChange?.(mediaId, result.likesCount, result.liked);
    } catch {
      setLiked(previousLiked);
      setLikesCount(previousCount);
      onCountChange?.(mediaId, previousCount, previousLiked);
    } finally {
      setIsPending(false);
      window.setTimeout(() => setIsAnimating(false), 420);
    }
  }

  const isIcon = variant === "icon";
  const isOverlay = variant === "overlay";

  return (
    <button
      type="button"
      aria-label={liked ? "Descurtir" : "Curtir"}
      aria-pressed={liked}
      disabled={isPending}
      onClick={(event) => void handleClick(event)}
      className={
        isIcon
          ? "grid size-11 place-items-center rounded-full bg-black/35 text-xl backdrop-blur-md transition hover:bg-black/50 active:scale-95 disabled:opacity-60 sm:size-12"
          : isOverlay
            ? "inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm font-semibold text-white/90 backdrop-blur-md transition hover:bg-black/55 disabled:opacity-60"
            : "inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-60"
      }
    >
      <span
        aria-hidden
        className={`leading-none transition duration-300 ${
          isAnimating ? "animate-media-like-pop" : ""
        } ${liked && !isIcon ? "scale-110" : "scale-100"}`}
      >
        {liked ? "❤️" : "🤍"}
      </span>
      {!isIcon ? (
        <span className="tabular-nums">{formatLikeCount(likesCount)}</span>
      ) : null}
    </button>
  );
}

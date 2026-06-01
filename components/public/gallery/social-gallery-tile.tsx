"use client";

import Link from "next/link";
import { useState } from "react";

import { MediaBadge } from "@/components/public/media-badge";
import { MediaLikeButton } from "@/components/public/media-like-button";
import {
  galleryMediaElementId,
  setGalleryFocusMedia,
} from "@/lib/gallery/gallery-scroll-restore";
import { setGalleryOpenPreviewFromVideo } from "@/lib/gallery/gallery-open-preview";
import { startMediaOpenTrace } from "@/lib/gallery/media-open-perf";
import { routes } from "@/lib/routes";
import type { EventVideo } from "@/types/video";

type SocialGalleryTileProps = {
  video: EventVideo;
  isNew?: boolean;
  allowLikes?: boolean;
  onLikeCountChange?: (
    mediaId: string,
    likesCount: number,
    liked: boolean,
  ) => void;
};

function VideoPlayIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5 text-white drop-shadow"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M8 5.14v13.72L19 12 8 5.14z" />
    </svg>
  );
}

export function SocialGalleryTile({
  video,
  isNew = false,
  allowLikes = false,
  onLikeCountChange,
}: SocialGalleryTileProps) {
  const [loaded, setLoaded] = useState(false);

  const thumb =
    video.thumbnailUrl ??
    video.thumbnail ??
    (video.mediaType !== "video" ? video.url : undefined);

  return (
    <article
      id={galleryMediaElementId(video.id)}
      className={`group relative aspect-square min-w-0 overflow-hidden bg-black/50 transition duration-300 ${
        isNew ? "animate-gallery-fade-in" : ""
      }`}
    >
      <Link
        href={routes.video(video.id)}
        onClick={() => {
          startMediaOpenTrace(video.id);
          setGalleryOpenPreviewFromVideo(video);
          setGalleryFocusMedia(video.eventSlug, video.id);
        }}
        className="relative block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/50"
        aria-label={video.title}
      >
        {!loaded && thumb ? (
          <div className="absolute inset-0 skeleton-shimmer" aria-hidden />
        ) : null}

        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-500 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${video.accent}`}
            aria-hidden
          />
        )}

        {video.mediaType === "gif" || video.mediaType === "boomerang" ? (
          <span className="pointer-events-none absolute left-1.5 top-1.5 z-10">
            <MediaBadge kind={video.mediaType} size="sm" />
          </span>
        ) : null}

        {video.mediaType === "video" ? (
          <span className="pointer-events-none absolute bottom-1.5 left-1.5 opacity-90">
            <VideoPlayIcon />
          </span>
        ) : null}
      </Link>

      {allowLikes ? (
        <div className="absolute bottom-1.5 right-1.5 z-20">
          <MediaLikeButton
            key={`${video.id}-${video.likesCount ?? 0}`}
            mediaId={video.id}
            initialCount={video.likesCount ?? 0}
            allowLikes={allowLikes}
            onCountChange={onLikeCountChange}
          />
        </div>
      ) : null}
    </article>
  );
}

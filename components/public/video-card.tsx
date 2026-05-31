"use client";

import Link from "next/link";
import type { EventVideo } from "@/types/video";
import {
  galleryMediaElementId,
  setGalleryFocusMedia,
} from "@/lib/gallery/gallery-scroll-restore";
import { routes } from "@/lib/routes";
import { MediaBadge } from "./media-badge";
import { MediaLikeButton } from "./media-like-button";
import { VideoThumbnail } from "./video-thumbnail";

type VideoCardProps = {
  video: EventVideo;
  index: number;
  isNew?: boolean;
  /** Vista 2 colunas no celular: espaços, raios e título reduzidos (só abaixo de `md`). */
  compactMobileTwoCol?: boolean;
  allowLikes?: boolean;
  onLikeCountChange?: (
    mediaId: string,
    likesCount: number,
    liked: boolean,
  ) => void;
  hideEventLabel?: boolean;
};

/** Mostra ~10% dos caracteres do título (+ reticências) para caber em grelha compacta. */
function shortTitleForCompact(title: string): string {
  const t = title.trim();
  if (t.length <= 6) {
    return t;
  }
  const n = Math.max(4, Math.ceil(t.length * 0.1));
  return `${t.slice(0, n).trimEnd()}…`;
}

export function VideoCard({
  video,
  index,
  isNew = false,
  compactMobileTwoCol = false,
  allowLikes = false,
  onLikeCountChange,
  hideEventLabel = false,
}: VideoCardProps) {
  const c = compactMobileTwoCol;

  return (
    <article
      id={galleryMediaElementId(video.id)}
      className={`group relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_28px_80px_rgba(0,0,0,0.4)] md:rounded-[1.75rem] md:p-2.5 ${
        isNew ? "animate-slide-in-media animate-glow-new border-fuchsia-400/40" : "animate-rise"
      } ${
        c ? "max-md:rounded-xl max-md:p-1.5 max-md:shadow-[0_12px_36px_rgba(0,0,0,0.35)] max-md:hover:translate-y-0" : ""
      }`}
      style={{ animationDelay: isNew ? undefined : `${index * 50}ms` }}
    >
      <Link
        href={routes.video(video.id)}
        onClick={() => setGalleryFocusMedia(video.eventSlug, video.id)}
        className={`relative block rounded-[2rem] outline-none transition duration-300 focus-visible:ring-4 focus-visible:ring-amber-300/40 active:scale-[0.98] ${
          c ? "max-md:rounded-lg" : ""
        }`}
      >
        <div
          className={`pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-2 ${
            c ? "max-md:left-1.5 max-md:top-1.5" : ""
          }`}
        >
          <MediaBadge kind={video.mediaType} />
          {isNew ? (
            <span className="w-fit rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-400 px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wider text-slate-950 shadow-lg">
              Novo
            </span>
          ) : null}
        </div>
        <VideoThumbnail video={video} variant="vertical" />
        {allowLikes ? (
          <div className="pointer-events-auto absolute bottom-3 right-3 z-20 max-md:bottom-1.5 max-md:right-1.5">
            <MediaLikeButton
              key={`${video.id}-${video.likesCount ?? 0}`}
              mediaId={video.id}
              initialCount={video.likesCount ?? 0}
              allowLikes={allowLikes}
              onCountChange={onLikeCountChange}
            />
          </div>
        ) : null}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[1.5rem] bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-16 md:rounded-b-[1.65rem] ${
            c ? "max-md:rounded-b-lg max-md:px-1.5 max-md:pb-1.5 max-md:pt-10" : ""
          }`}
        >
          <div className="min-w-0">
            {!hideEventLabel ? (
              <p
                className={`mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amber-200/80 ${
                  c ? "max-md:mb-0.5 max-md:text-[0.5rem] max-md:tracking-[0.12em]" : ""
                }`}
              >
                {video.event}
              </p>
            ) : null}
            <h2
              className={`overflow-hidden text-base font-semibold leading-tight tracking-tight text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] md:text-lg ${
                c
                  ? "max-md:line-clamp-1 max-md:text-[0.7rem] max-md:font-medium md:text-lg"
                  : ""
              }`}
            >
              <span className="md:hidden">
                {c ? shortTitleForCompact(video.title) : video.title}
              </span>
              <span className="hidden md:inline">{video.title}</span>
            </h2>
          </div>
        </div>
      </Link>
    </article>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { EventMedia } from "@/types/media";
import { MediaLikeButton } from "./media-like-button";
import { VideoThumbnail } from "./video-thumbnail";

type MediaStageProps = {
  media: EventMedia;
  autoPlay?: boolean;
  /** Página pública individual: overlays na mídia e altura otimizada para mobile. */
  standalone?: boolean;
  eventHref?: string;
  allowLikes?: boolean;
};

function SharedMediaOverlays({
  eventHref,
  allowLikes,
  media,
}: {
  eventHref?: string;
  allowLikes?: boolean;
  media: EventMedia;
}) {
  return (
    <>
      {eventHref ? (
        <Link
          href={eventHref}
          className="absolute left-3 top-3 z-30 inline-flex min-h-9 items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-[13px] font-semibold text-white/92 shadow-sm backdrop-blur-md transition hover:bg-black/55 active:scale-[0.98]"
        >
          <span aria-hidden>←</span>
          Galeria
        </Link>
      ) : null}
      {allowLikes ? (
        <div className="absolute bottom-3 right-3 z-30">
          <MediaLikeButton
            mediaId={media.id}
            initialCount={media.likesCount ?? 0}
            allowLikes={allowLikes}
            variant="icon"
          />
        </div>
      ) : null}
    </>
  );
}

export function MediaStage({
  media,
  autoPlay = false,
  standalone = false,
  eventHref,
  allowLikes = false,
}: MediaStageProps) {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const onReady = useCallback(() => setLoadState("ready"), []);
  const onErr = useCallback(() => setLoadState("error"), []);

  const skeleton =
    loadState === "loading" ? (
      <div
        className="absolute inset-0 z-[5] animate-pulse bg-gradient-to-br from-white/12 via-white/[0.04] to-transparent backdrop-blur-[2px]"
        aria-hidden
      />
    ) : null;

  if (media.mediaType === "video") {
    const videoShellClass = standalone
      ? "relative mx-auto h-[min(56dvh,640px)] w-auto max-w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_22px_80px_rgba(0,0,0,0.55)] aspect-[9/16]"
      : "relative aspect-[9/16] w-full max-w-[420px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_22px_80px_rgba(0,0,0,0.55)] sm:rounded-2xl xl:max-w-[min(420px,38vw)] 2xl:max-w-[400px]";

    return (
      <div
        className={
          standalone
            ? "flex w-full justify-center"
            : "flex w-full justify-center px-1 sm:px-0"
        }
      >
        <div className={videoShellClass}>
          {standalone ? (
            <SharedMediaOverlays
              eventHref={eventHref}
              allowLikes={allowLikes}
              media={media}
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 z-[1] opacity-35">
            <VideoThumbnail video={media} variant="vertical" fillParent />
          </div>
          {skeleton}
          <video
            className={`absolute inset-0 z-10 h-full w-full bg-black object-contain transition-opacity duration-700 ease-out ${
              loadState === "ready" ? "opacity-100" : "opacity-0"
            }`}
            controls
            playsInline
            preload="metadata"
            autoPlay={autoPlay}
            muted={autoPlay}
            src={media.url}
            onLoadedData={onReady}
            onError={onErr}
          >
            Seu navegador não suporta vídeo HTML5.
          </video>
          {loadState === "error" ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-black/82 px-6 text-center">
              <p className="max-w-md text-lg font-semibold text-white/88">
                Não foi possível carregar este vídeo.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const imageShellClass = standalone
    ? "relative mx-auto flex w-full max-w-[420px] max-h-[min(56dvh,640px)] min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#050508] shadow-[0_22px_80px_rgba(0,0,0,0.55)]"
    : "relative flex min-h-[52dvh] items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050508] shadow-[0_30px_120px_rgba(0,0,0,0.65)]";

  const imageMaxHeight = standalone
    ? "max-h-[min(56dvh,640px)]"
    : "max-h-[min(82dvh,1200px)]";

  return (
    <div className={imageShellClass}>
      {standalone ? (
        <SharedMediaOverlays
          eventHref={eventHref}
          allowLikes={allowLikes}
          media={media}
        />
      ) : null}
      {skeleton}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.url}
        alt=""
        decoding="async"
        className={`relative z-10 w-full object-contain transition-all duration-700 ease-out ${imageMaxHeight} ${
          loadState === "ready"
            ? "scale-100 opacity-100"
            : "scale-[0.985] opacity-0"
        }`}
        onLoad={onReady}
        onError={onErr}
      />
      {loadState === "error" ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/85 px-6 text-center">
          <p className="max-w-md text-lg font-semibold text-white/88">
            Não foi possível carregar esta mídia.
          </p>
        </div>
      ) : null}
    </div>
  );
}

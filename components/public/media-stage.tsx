"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaPerfSlot } from "@/components/public/shared-media-standalone";
import { readyMediaCache } from "@/lib/gallery/preload-media";
import {
  markMediaOpenPhase,
  notifyMediaOpenCurrentMediaReady,
} from "@/lib/gallery/media-open-perf";
import type { EventMedia } from "@/types/media";
import {
  StandaloneMediaChrome,
  type StandaloneMediaChromeProps,
} from "./standalone-media-chrome";
import { VideoThumbnail } from "./video-thumbnail";

type MediaStageProps = {
  media: EventMedia;
  autoPlay?: boolean;
  /** Página pública individual: mídia em destaque + overlays flutuantes. */
  standalone?: boolean;
  /** Carrossel lateral: poster persistente e preload agressivo. */
  inCarousel?: boolean;
  /** Instrumentação temporária de abertura. */
  perfSlot?: MediaPerfSlot;
  standaloneChrome?: StandaloneMediaChromeProps;
};

function posterUrl(media: EventMedia): string | undefined {
  const thumb = media.thumbnailUrl ?? media.thumbnail;
  if (thumb?.trim()) {
    return thumb.trim();
  }

  if (media.mediaType !== "video") {
    return media.url;
  }

  return undefined;
}

type LoadState = "loading" | "ready" | "error";

function resolveLoadState(
  media: EventMedia,
  loadStateById: Record<string, LoadState>,
): LoadState {
  const tracked = loadStateById[media.id];

  if (tracked) {
    return tracked;
  }

  if (readyMediaCache.has(media.id)) {
    return "ready";
  }

  return "loading";
}

export function MediaStage({
  media,
  autoPlay = false,
  standalone = false,
  inCarousel = false,
  perfSlot,
  standaloneChrome,
}: MediaStageProps) {
  const renderedLoggedRef = useRef(false);
  const [loadStateById, setLoadStateById] = useState<Record<string, LoadState>>(
    {},
  );

  const loadState = resolveLoadState(media, loadStateById);
  const isPrimaryPerfTarget =
    perfSlot === "current" || perfSlot === "standalone";

  const notifyReady = useCallback(
    (source: string) => {
      if (!isPrimaryPerfTarget) {
        return;
      }

      notifyMediaOpenCurrentMediaReady({
        mediaId: media.id,
        mediaType: media.mediaType,
        source,
      });
    },
    [isPrimaryPerfTarget, media.id, media.mediaType],
  );

  useEffect(() => {
    if (!isPrimaryPerfTarget || renderedLoggedRef.current) {
      return;
    }

    renderedLoggedRef.current = true;
    markMediaOpenPhase("current-media-rendered", {
      mediaId: media.id,
      mediaType: media.mediaType,
      cached: readyMediaCache.has(media.id),
      loadState,
    });

    if (loadState === "ready") {
      notifyReady("cache-on-render");
    }
  }, [
    isPrimaryPerfTarget,
    loadState,
    media.id,
    media.mediaType,
    notifyReady,
  ]);

  const markReady = useCallback(() => {
    readyMediaCache.add(media.id);
    setLoadStateById((current) => {
      if (current[media.id] === "ready") {
        return current;
      }

      return { ...current, [media.id]: "ready" };
    });
    notifyReady("media-decode");
  }, [media.id, notifyReady]);

  const onErr = useCallback(() => {
    setLoadStateById((current) => ({ ...current, [media.id]: "error" }));
  }, [media.id]);

  const poster = posterUrl(media);
  const showPoster = Boolean(poster) && loadState !== "ready";
  const carouselShell = standalone && inCarousel;

  if (media.mediaType === "video") {
    const videoShellClass = standalone
      ? "relative mx-auto aspect-[9/16] h-[min(90dvh,calc(100dvh-1rem))] w-auto max-w-[min(100vw-1rem,600px)] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#050508] shadow-[0_22px_80px_rgba(0,0,0,0.55)] sm:rounded-2xl"
      : "relative aspect-[9/16] w-full max-w-[420px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#050508] shadow-[0_22px_80px_rgba(0,0,0,0.55)] sm:rounded-2xl xl:max-w-[min(420px,38vw)] 2xl:max-w-[400px]";

    return (
      <div
        className={
          standalone
            ? "flex w-full flex-1 items-center justify-center"
            : "flex w-full justify-center px-1 sm:px-0"
        }
      >
        <div className={videoShellClass}>
          {standalone && standaloneChrome ? (
            <StandaloneMediaChrome {...standaloneChrome} />
          ) : null}
          <div
            className={`absolute inset-0 z-[1] ${
              carouselShell || showPoster ? "opacity-100" : "opacity-35"
            }`}
            aria-hidden
          >
            <VideoThumbnail video={media} variant="vertical" fillParent />
          </div>
          <video
            className={`absolute inset-0 z-10 h-full w-full object-contain transition-opacity duration-300 ease-out ${
              loadState === "ready" ? "opacity-100" : "opacity-0"
            }`}
            style={inCarousel ? { touchAction: "pan-y" } : undefined}
            controls={loadState === "ready"}
            playsInline
            preload={inCarousel ? "auto" : "metadata"}
            autoPlay={autoPlay}
            muted={autoPlay}
            src={media.url}
            onLoadedData={markReady}
            onCanPlay={markReady}
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
    ? "relative mx-auto flex w-full max-w-[min(100vw-1rem,800px)] min-h-[min(72dvh,720px)] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#050508] shadow-[0_22px_80px_rgba(0,0,0,0.55)] sm:rounded-2xl"
    : "relative flex min-h-[52dvh] items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050508] shadow-[0_30px_120px_rgba(0,0,0,0.65)]";

  const imageMaxHeight = standalone
    ? "max-h-[min(90dvh,calc(100dvh-1rem))]"
    : "max-h-[min(82dvh,1200px)]";

  return (
    <div className={imageShellClass}>
      {standalone && standaloneChrome ? (
        <StandaloneMediaChrome {...standaloneChrome} />
      ) : null}
      {poster && showPoster && poster !== media.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden
          className={`absolute inset-0 z-[5] w-full object-contain ${imageMaxHeight}`}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.url}
        alt=""
        decoding="async"
        loading={inCarousel ? "eager" : "lazy"}
        className={`relative z-10 w-full object-contain transition-opacity duration-300 ease-out ${imageMaxHeight} ${
          inCarousel || loadState === "ready" ? "opacity-100" : "opacity-0"
        }`}
        onLoad={markReady}
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

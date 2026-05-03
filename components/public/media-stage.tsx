"use client";

import { useCallback, useState } from "react";
import type { EventMedia } from "@/types/media";
import { VideoThumbnail } from "./video-thumbnail";

type MediaStageProps = {
  media: EventMedia;
  autoPlay?: boolean;
};

export function MediaStage({ media, autoPlay = false }: MediaStageProps) {
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
    return (
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <div className="pointer-events-none absolute inset-0 opacity-35">
          <VideoThumbnail video={media} isLarge />
        </div>
        {skeleton}
        <video
          className={`relative z-10 aspect-video h-full w-full bg-black object-contain transition-opacity duration-700 ease-out ${
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
    );
  }

  return (
    <div className="relative flex min-h-[52dvh] items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050508] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
      {skeleton}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.url}
        alt=""
        decoding="async"
        className={`relative z-10 max-h-[min(82dvh,1200px)] w-full object-contain transition-all duration-700 ease-out ${
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

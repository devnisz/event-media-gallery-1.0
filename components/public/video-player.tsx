"use client";

import type { MediaPerfSlot } from "@/components/public/shared-media-standalone";
import type { EventMedia } from "@/types/media";
import type { StandaloneMediaChromeProps } from "./standalone-media-chrome";
import { MediaStage } from "./media-stage";

type VideoPlayerProps = {
  video: EventMedia;
  autoPlay?: boolean;
  standalone?: boolean;
  inCarousel?: boolean;
  perfSlot?: MediaPerfSlot;
  standaloneChrome?: StandaloneMediaChromeProps;
};

/** Player unificado da galeria (vídeo, foto ou GIF). */
export function VideoPlayer({
  video,
  autoPlay = false,
  standalone = false,
  inCarousel = false,
  perfSlot,
  standaloneChrome,
}: VideoPlayerProps) {
  return (
    <MediaStage
      media={video}
      autoPlay={autoPlay}
      standalone={standalone}
      inCarousel={inCarousel}
      perfSlot={perfSlot}
      standaloneChrome={standaloneChrome}
    />
  );
}

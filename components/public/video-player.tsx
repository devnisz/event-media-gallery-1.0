"use client";

import type { EventMedia } from "@/types/media";
import { MediaStage } from "./media-stage";

type VideoPlayerProps = {
  video: EventMedia;
  autoPlay?: boolean;
  standalone?: boolean;
  eventHref?: string;
  allowLikes?: boolean;
};

/** Player unificado da galeria (vídeo, foto ou GIF). */
export function VideoPlayer({
  video,
  autoPlay = false,
  standalone = false,
  eventHref,
  allowLikes = false,
}: VideoPlayerProps) {
  return (
    <MediaStage
      media={video}
      autoPlay={autoPlay}
      standalone={standalone}
      eventHref={eventHref}
      allowLikes={allowLikes}
    />
  );
}

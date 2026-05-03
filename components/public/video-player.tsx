"use client";

import type { EventMedia } from "@/types/media";
import { MediaStage } from "./media-stage";

type VideoPlayerProps = {
  video: EventMedia;
  autoPlay?: boolean;
};

/** Player unificado da galeria (vídeo, foto ou GIF). */
export function VideoPlayer({ video, autoPlay = false }: VideoPlayerProps) {
  return <MediaStage media={video} autoPlay={autoPlay} />;
}

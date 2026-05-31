"use client";

import { VideoPlayer } from "@/components/public/video-player";
import { routes } from "@/lib/routes";
import type { EventMedia } from "@/types/media";

type SharedMediaStandaloneProps = {
  media: EventMedia;
  eventHref: string;
  eventSlug: string;
  onBackToGallery: () => void;
  downloadFileName: string;
  allowLikes: boolean;
  allowMediaShare: boolean;
  positionIndex?: number;
  positionTotal?: number;
  enableNavigation?: boolean;
  /** Carrossel: chrome fica fixo no navigator. */
  hideChrome?: boolean;
  /** Só a mídia ativa deve dar autoplay em vídeos. */
  isActiveSlide?: boolean;
};

export function SharedMediaStandalone({
  media,
  eventHref,
  eventSlug,
  onBackToGallery,
  downloadFileName,
  allowLikes,
  allowMediaShare,
  positionIndex,
  positionTotal,
  enableNavigation = false,
  hideChrome = false,
  isActiveSlide = true,
}: SharedMediaStandaloneProps) {
  return (
    <div className="flex h-full w-full flex-1 items-center justify-center">
      <VideoPlayer
        video={media}
        autoPlay={isActiveSlide}
        standalone
        standaloneChrome={
          hideChrome
            ? undefined
            : {
                media,
                eventHref,
                eventSlug,
                onBackToGallery,
                allowLikes,
                allowMediaShare,
                downloadHref: routes.mediaDownload(media.id),
                downloadFileName,
                positionIndex,
                positionTotal,
                enableNavigation,
              }
        }
      />
    </div>
  );
}

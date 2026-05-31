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
}: SharedMediaStandaloneProps) {
  return (
    <div className="flex w-full flex-1 items-center justify-center">
      <VideoPlayer
        key={media.id}
        video={media}
        autoPlay
        standalone
        standaloneChrome={{
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
        }}
      />
    </div>
  );
}

"use client";

import { VideoPlayer } from "@/components/public/video-player";
import { routes } from "@/lib/routes";
import type { EventMedia } from "@/types/media";

type SharedMediaStandaloneProps = {
  media: EventMedia;
  eventHref: string;
  downloadFileName: string;
  allowLikes: boolean;
  allowMediaShare: boolean;
};

export function SharedMediaStandalone({
  media,
  eventHref,
  downloadFileName,
  allowLikes,
  allowMediaShare,
}: SharedMediaStandaloneProps) {
  return (
    <div className="flex w-full flex-1 items-center justify-center">
      <VideoPlayer
        video={media}
        autoPlay
        standalone
        standaloneChrome={{
          media,
          eventHref,
          allowLikes,
          allowMediaShare,
          downloadHref: routes.mediaDownload(media.id),
          downloadFileName,
        }}
      />
    </div>
  );
}

"use client";

import { DownloadButton } from "@/components/public/download-button";
import { MediaShareButton } from "@/components/public/media-share-button";
import { PublicMediaDeleteButton } from "@/components/public/public-media-delete-button";
import { VideoPlayer } from "@/components/public/video-player";
import { routes } from "@/lib/routes";
import type { EventMedia } from "@/types/media";

type SharedMediaStandaloneProps = {
  media: EventMedia;
  eventHref: string;
  downloadLabel: string;
  downloadFileName: string;
  allowLikes: boolean;
  allowMediaShare: boolean;
};

export function SharedMediaStandalone({
  media,
  eventHref,
  downloadLabel,
  downloadFileName,
  allowLikes,
  allowMediaShare,
}: SharedMediaStandaloneProps) {
  const downloadText = downloadLabel.startsWith("⬇")
    ? downloadLabel
    : `⬇ ${downloadLabel}`;

  return (
    <div className="flex w-full flex-col gap-3 sm:gap-3.5">
      <VideoPlayer
        video={media}
        autoPlay
        standalone
        eventHref={eventHref}
        allowLikes={allowLikes}
      />

      <div className="flex flex-col gap-2">
        {allowMediaShare ? (
          <MediaShareButton
            mediaId={media.id}
            mediaType={media.mediaType}
            allowMediaShare={allowMediaShare}
            variant="pill"
            fullWidth
          />
        ) : null}
        <DownloadButton
          href={routes.mediaDownload(media.id)}
          label={downloadText}
          fileName={downloadFileName}
          variant="secondary"
        />
      </div>

      {media.allowPublicDelete ? (
        <div className="flex justify-center pt-0.5">
          <PublicMediaDeleteButton
            mediaId={media.id}
            title={media.title}
            eventHref={eventHref}
            requireDeletePin={media.requireDeletePin}
          />
        </div>
      ) : null}
    </div>
  );
}

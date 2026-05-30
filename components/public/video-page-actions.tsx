"use client";

import { MediaViewerActions } from "@/components/public/media-viewer-actions";
import { routes } from "@/lib/routes";
import type { EventMedia } from "@/types/media";

type VideoPageActionsProps = {
  video: EventMedia;
  downloadLabel: string;
  downloadFileName: string;
  allowLikes: boolean;
  allowMediaShare: boolean;
};

export function VideoPageActions({
  video,
  downloadLabel,
  downloadFileName,
  allowLikes,
  allowMediaShare,
}: VideoPageActionsProps) {
  return (
    <MediaViewerActions
      media={video}
      downloadHref={routes.mediaDownload(video.id)}
      downloadFileName={downloadFileName}
      downloadLabel={downloadLabel}
      allowLikes={allowLikes}
      allowMediaShare={allowMediaShare}
      layout="footer"
    />
  );
}

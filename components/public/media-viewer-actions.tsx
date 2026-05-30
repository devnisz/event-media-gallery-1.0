"use client";

import { MediaDownloadIconButton } from "@/components/public/media-download-icon-button";
import { MediaLikeButton } from "@/components/public/media-like-button";
import { MediaShareButton } from "@/components/public/media-share-button";
import type { EventMedia } from "@/types/media";

type MediaViewerActionsProps = {
  media: Pick<
    EventMedia,
    "id" | "mediaType" | "likesCount" | "qrUrl"
  >;
  downloadHref: string;
  downloadFileName: string;
  downloadLabel: string;
  allowLikes: boolean;
  allowMediaShare: boolean;
  layout?: "row" | "footer";
  onLikeCountChange?: (
    mediaId: string,
    likesCount: number,
    liked: boolean,
  ) => void;
};

export function MediaViewerActions({
  media,
  downloadHref,
  downloadFileName,
  downloadLabel,
  allowLikes,
  allowMediaShare,
  layout = "row",
  onLikeCountChange,
}: MediaViewerActionsProps) {
  const isFooter = layout === "footer";

  return (
    <div
      className={
        isFooter
          ? "flex items-center justify-end gap-2"
          : "flex items-center gap-2"
      }
    >
      {allowMediaShare ? (
        <MediaShareButton
          mediaId={media.id}
          mediaType={media.mediaType}
          allowMediaShare={allowMediaShare}
          variant="icon"
        />
      ) : null}
      {allowLikes ? (
        <MediaLikeButton
          key={`${media.id}-${media.likesCount ?? 0}`}
          mediaId={media.id}
          initialCount={media.likesCount ?? 0}
          allowLikes={allowLikes}
          variant="icon"
          onCountChange={onLikeCountChange}
        />
      ) : null}
      <MediaDownloadIconButton
        href={downloadHref}
        fileName={downloadFileName}
        label={downloadLabel}
      />
    </div>
  );
}

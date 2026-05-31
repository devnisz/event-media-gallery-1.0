"use client";

import { DownloadButton } from "@/components/public/download-button";
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
  layout?: "row" | "footer" | "stack";
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
  if (layout === "stack") {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-2.5">
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
          href={downloadHref}
          label={downloadLabel}
          fileName={downloadFileName}
          variant="secondary"
        />
        {allowLikes ? (
          <div className="flex justify-center pt-1">
            <MediaLikeButton
              key={`${media.id}-${media.likesCount ?? 0}`}
              mediaId={media.id}
              initialCount={media.likesCount ?? 0}
              allowLikes={allowLikes}
              variant="icon"
              onCountChange={onLikeCountChange}
            />
          </div>
        ) : null}
      </div>
    );
  }

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

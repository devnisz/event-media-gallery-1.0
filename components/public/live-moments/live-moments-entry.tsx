"use client";

import { useMemo, useState } from "react";

import type { LiveMomentsSortOrder } from "@/lib/live-moments/config";
import { buildLiveMomentsFromGalleryMedia } from "@/lib/live-moments/media";
import type { EventMedia } from "@/types/media";
import { LiveMomentsPreviewCard } from "./live-moments-preview-card";
import { LiveMomentsViewer } from "./live-moments-viewer";

type LiveMomentsEntryProps = {
  media: EventMedia[];
  sortOrder?: LiveMomentsSortOrder;
  allowLikes?: boolean;
  onLikeCountChange?: (
    mediaId: string,
    likesCount: number,
    liked: boolean,
  ) => void;
};

export function LiveMomentsEntry({
  media,
  sortOrder = "newest-first",
  allowLikes = false,
  onLikeCountChange,
}: LiveMomentsEntryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);

  const moments = useMemo(
    () => buildLiveMomentsFromGalleryMedia(media, sortOrder),
    [media, sortOrder],
  );

  if (moments.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <LiveMomentsPreviewCard
          moments={moments}
          onOpen={() => setViewerOpen(true)}
        />
      </div>

      {viewerOpen ? (
        <LiveMomentsViewer
          items={moments}
          allowLikes={allowLikes}
          onLikeCountChange={onLikeCountChange}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}
    </>
  );
}

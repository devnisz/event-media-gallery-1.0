"use client";

import type { GalleryGridSharedProps } from "./types";
import { SocialGalleryTile } from "./social-gallery-tile";

export function SocialGalleryGrid({
  videos,
  newMediaIds,
  removingIds,
  allowPublicDelete,
  requireDeletePin,
  allowLikes,
  onDeleted,
  onLikeCountChange,
}: GalleryGridSharedProps) {
  return (
    <div className="grid grid-cols-3 gap-px sm:gap-0.5 md:grid-cols-5 lg:grid-cols-6">
      {videos.map((video) => (
        <SocialGalleryTile
          key={video.id}
          video={video}
          isNew={newMediaIds.has(video.id)}
          isRemoving={removingIds.has(video.id)}
          allowPublicDelete={allowPublicDelete}
          requireDeletePin={requireDeletePin}
          allowLikes={allowLikes}
          onDeleted={onDeleted}
          onLikeCountChange={onLikeCountChange}
        />
      ))}
    </div>
  );
}

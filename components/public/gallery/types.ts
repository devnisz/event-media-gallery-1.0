import type { EventVideo } from "@/types/video";

export type GalleryGridSharedProps = {
  videos: EventVideo[];
  newMediaIds: Set<string>;
  removingIds: Set<string>;
  allowPublicDelete: boolean;
  requireDeletePin: boolean;
  allowLikes: boolean;
  onDeleted: (id: string) => void;
  onLikeCountChange?: (
    mediaId: string,
    likesCount: number,
    liked: boolean,
  ) => void;
};

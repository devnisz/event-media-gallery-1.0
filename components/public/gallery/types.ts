import type { EventVideo } from "@/types/video";

export type GalleryGridSharedProps = {
  videos: EventVideo[];
  newMediaIds: Set<string>;
  allowLikes: boolean;
  allowMediaShare: boolean;
  onLikeCountChange?: (
    mediaId: string,
    likesCount: number,
    liked: boolean,
  ) => void;
};

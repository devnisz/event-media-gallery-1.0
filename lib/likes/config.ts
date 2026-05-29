import type { GalleryEventRecord, StoredEventLoose } from "@/types/event";

export type LikesEventConfig = {
  enabled: boolean;
};

export function resolveLikesConfig(
  source: Pick<GalleryEventRecord, "allowLikes"> | StoredEventLoose,
): LikesEventConfig {
  return {
    enabled: source.allowLikes === true,
  };
}

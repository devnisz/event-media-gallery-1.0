import { resolveLikesConfig } from "@/lib/likes/config";
import { resolveMediaShareConfig } from "@/lib/share/config";
import type { GalleryEventRecord } from "@/types/event";

export type PublicGalleryEventSettings = {
  allowPublicDelete: boolean;
  requireDeletePin: boolean;
  allowLikes: boolean;
  allowMediaShare: boolean;
};

export function getPublicGalleryEventSettings(
  event: GalleryEventRecord | undefined,
): PublicGalleryEventSettings {
  const likes = resolveLikesConfig(event ?? {});
  const share = resolveMediaShareConfig(event ?? {});

  return {
    allowPublicDelete: event?.allowPublicDelete === true,
    requireDeletePin:
      event?.allowPublicDelete === true && event?.requireDeletePin === true,
    allowLikes: likes.enabled,
    allowMediaShare: share.enabled,
  };
}

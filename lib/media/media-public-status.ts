import { routes } from "@/lib/routes";
import {
  isMediaSoftDeleted,
  isMediaVisiblePublicly,
  readGalleryVideosRaw,
} from "@/services/mediaService";
import type { MediaReviewStatus } from "@/types/media";

export type MediaPublicStatusResponse =
  | {
      exists: false;
      ready: false;
    }
  | {
      exists: true;
      ready: false;
      reviewStatus: MediaReviewStatus;
    }
  | {
      exists: true;
      ready: true;
      reviewStatus: "approved";
      publicUrl: string;
    };

/**
 * Estado público de uma mídia para landing de espera (Fase 2.1E-1).
 * `ready` só quando existe, visível e `reviewStatus === approved`.
 */
export async function getMediaPublicStatus(
  mediaId: string,
): Promise<MediaPublicStatusResponse> {
  const id = mediaId.trim();

  if (!id) {
    return { exists: false, ready: false };
  }

  const galleryMedia = await readGalleryVideosRaw();
  const item = galleryMedia.find((record) => record.id === id);

  if (!item || isMediaSoftDeleted(item)) {
    return { exists: false, ready: false };
  }

  if (!isMediaVisiblePublicly(item)) {
    return {
      exists: true,
      ready: false,
      reviewStatus: item.reviewStatus,
    };
  }

  return {
    exists: true,
    ready: true,
    reviewStatus: "approved",
    publicUrl: routes.media(item.id),
  };
}

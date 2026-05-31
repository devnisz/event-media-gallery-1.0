import type { GalleryMediaRecord } from "@/types/media";

export const GALLERY_MEDIA_PUBLISHED_EVENT = "midiaup:gallery-media-published";

export type GalleryMediaPublishedDetail = {
  media: GalleryMediaRecord;
  eventSlug: string;
  eventId: string;
};

export function dispatchGalleryMediaPublished(
  detail: GalleryMediaPublishedDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<GalleryMediaPublishedDetail>(GALLERY_MEDIA_PUBLISHED_EVENT, {
      detail,
    }),
  );
}

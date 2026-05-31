/** Âncora na galeria para retorno com foco na mídia visualizada. */
export function galleryMediaElementId(mediaId: string): string {
  return `gallery-media-${mediaId}`;
}

export function galleryMediaHash(mediaId: string): string {
  return `#${galleryMediaElementId(mediaId)}`;
}

export function setGalleryFocusMedia(eventSlug: string, mediaId: string): void {
  if (typeof window === "undefined" || !eventSlug.trim() || !mediaId.trim()) {
    return;
  }

  try {
    sessionStorage.setItem(
      `gallery-focus:${eventSlug.trim()}`,
      mediaId.trim(),
    );
  } catch {
    /* ignore quota */
  }
}

export function getGalleryFocusMedia(eventSlug: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return sessionStorage.getItem(`gallery-focus:${eventSlug.trim()}`);
  } catch {
    return null;
  }
}

export function buildGalleryReturnHref(
  eventHref: string,
  eventSlug: string,
  mediaId: string,
): string {
  const focused = mediaId.trim() || getGalleryFocusMedia(eventSlug) || "";

  if (!focused) {
    return eventHref;
  }

  return `${eventHref}${galleryMediaHash(focused)}`;
}

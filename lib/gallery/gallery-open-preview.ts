const PREVIEW_KEY = "gallery:open-preview";

export type GalleryOpenPreview = {
  mediaId: string;
  eventSlug: string;
  mediaType: string;
  thumbnailUrl?: string;
};

export function setGalleryOpenPreview(preview: GalleryOpenPreview): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(preview));
  } catch {
    /* ignore quota */
  }
}

export function getGalleryOpenPreview(): GalleryOpenPreview | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(PREVIEW_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as GalleryOpenPreview;
  } catch {
    return null;
  }
}

export function clearGalleryOpenPreview(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    /* ignore */
  }
}

function previewThumbnail(video: {
  id: string;
  eventSlug: string;
  mediaType: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  url: string;
}): string | undefined {
  const thumb = video.thumbnailUrl ?? video.thumbnail;

  if (thumb?.trim()) {
    return thumb.trim();
  }

  if (video.mediaType !== "video") {
    return video.url;
  }

  return undefined;
}

export function setGalleryOpenPreviewFromVideo(video: {
  id: string;
  eventSlug: string;
  mediaType: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  url: string;
}): void {
  setGalleryOpenPreview({
    mediaId: video.id,
    eventSlug: video.eventSlug,
    mediaType: video.mediaType,
    thumbnailUrl: previewThumbnail(video),
  });
}

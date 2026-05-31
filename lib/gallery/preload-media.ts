import type { EventMedia } from "@/types/media";

const preloaded = new Set<string>();

function preloadKey(media: EventMedia): string {
  return `${media.id}:${media.url}`;
}

/** Pré-carrega URL principal (e miniatura de vídeo) para troca instantânea. */
export function preloadEventMedia(media: EventMedia | undefined): void {
  if (!media?.url?.trim()) {
    return;
  }

  const key = preloadKey(media);

  if (preloaded.has(key)) {
    return;
  }

  preloaded.add(key);

  if (media.mediaType === "video") {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = media.url;

    const thumb = media.thumbnailUrl ?? media.thumbnail;

    if (thumb?.trim()) {
      const img = new Image();
      img.src = thumb;
    }

    return;
  }

  const img = new Image();
  img.src = media.url;
}

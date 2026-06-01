import type { EventMedia } from "@/types/media";

const preloaded = new Set<string>();

/** Mídias cujo conteúdo principal já foi decodificado no browser. */
export const readyMediaCache = new Set<string>();

function preloadKey(media: EventMedia): string {
  return `${media.id}:${media.url}`;
}

function markMediaReady(media: EventMedia): void {
  if (media.id.trim()) {
    readyMediaCache.add(media.id.trim());
  }
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
    video.addEventListener("loadeddata", () => markMediaReady(media), {
      once: true,
    });

    const thumb = media.thumbnailUrl ?? media.thumbnail;

    if (thumb?.trim()) {
      const img = new Image();
      img.src = thumb;
    }

    return;
  }

  const img = new Image();
  img.src = media.url;
  img.onload = () => markMediaReady(media);
}

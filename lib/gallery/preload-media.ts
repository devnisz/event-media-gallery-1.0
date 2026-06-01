import type { EventMedia } from "@/types/media";
import {
  markMediaOpenPreload,
  type PreloadPerfRole,
} from "@/lib/gallery/media-open-perf";

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
export function preloadEventMedia(
  media: EventMedia | undefined,
  perfRole?: PreloadPerfRole,
): void {
  if (!media?.url?.trim()) {
    if (perfRole) {
      markMediaOpenPreload(perfRole, "skipped", { reason: "no-media" });
    }
    return;
  }

  const key = preloadKey(media);

  if (preloaded.has(key)) {
    if (perfRole) {
      markMediaOpenPreload(perfRole, "skipped", {
        mediaId: media.id,
        reason: "already-preloaded",
      });
    }
    return;
  }

  preloaded.add(key);

  if (perfRole) {
    markMediaOpenPreload(perfRole, "start", {
      mediaId: media.id,
      mediaType: media.mediaType,
    });
  }

  const finishPreload = () => {
    markMediaReady(media);

    if (perfRole) {
      markMediaOpenPreload(perfRole, "done", {
        mediaId: media.id,
        mediaType: media.mediaType,
      });
    }
  };

  if (media.mediaType === "video") {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = media.url;
    video.addEventListener("loadeddata", finishPreload, { once: true });
    video.addEventListener("error", () => {
      if (perfRole) {
        markMediaOpenPreload(perfRole, "done", {
          mediaId: media.id,
          mediaType: media.mediaType,
          error: true,
        });
      }
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
  img.onload = finishPreload;
  img.onerror = () => {
    if (perfRole) {
      markMediaOpenPreload(perfRole, "done", {
        mediaId: media.id,
        mediaType: media.mediaType,
        error: true,
      });
    }
  };
}

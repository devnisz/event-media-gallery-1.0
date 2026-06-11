import { getMediaPublicStatus } from "@/lib/media/media-public-status";
import type { MediaPublicStatusResponse } from "@/lib/media/media-public-status";
import { getEventBySlug } from "@/services/eventService";
import { getVideoById } from "@/services/videoService";
import type { EventMedia } from "@/types/media";

export type MediaPageRenderMode =
  | {
      mode: "viewer";
      video: EventMedia;
    }
  | {
      mode: "waiting";
      initialStatus: MediaPublicStatusResponse;
    };

/**
 * Decide entre viewer público e landing de espera (Fase 2.1E-1).
 * Nunca retorna 404 para mídia inexistente ou ainda não aprovada.
 */
export async function resolveMediaPageRenderMode(
  mediaId: string,
): Promise<MediaPageRenderMode> {
  const id = mediaId.trim();

  const video = await getVideoById(id);

  if (video) {
    const event = await getEventBySlug(video.eventSlug);

    if (event) {
      return { mode: "viewer", video };
    }
  }

  const initialStatus = await getMediaPublicStatus(id);

  if (initialStatus.ready) {
    const retryVideo = await getVideoById(id);

    if (retryVideo) {
      const event = await getEventBySlug(retryVideo.eventSlug);

      if (event) {
        return { mode: "viewer", video: retryVideo };
      }
    }
  }

  return { mode: "waiting", initialStatus };
}

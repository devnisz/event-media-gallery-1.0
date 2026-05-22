import type { GalleryMediaRecord } from "@/types/media";
import { getEventById } from "@/services/eventService";
import {
  isMediaSoftDeleted,
  loadGalleryVideosForMutation,
  softDeleteGalleryMedia,
} from "@/services/mediaService";
import { verifyDeletePin } from "@/lib/security/delete-pin";

export type PublicMediaDeleteResult =
  | { ok: true; media: GalleryMediaRecord }
  | { ok: false; status: number; error: string };

export async function softDeletePublicMedia(
  mediaId: string,
  pin?: string,
): Promise<PublicMediaDeleteResult> {
  const trimmedId = mediaId.trim();

  if (!trimmedId) {
    return { ok: false, status: 400, error: "Mídia inválida." };
  }

  const mediaList = await loadGalleryVideosForMutation();
  const media = mediaList.find((item) => item.id === trimmedId);

  if (!media || isMediaSoftDeleted(media) || media.isHidden) {
    return { ok: false, status: 404, error: "Mídia não encontrada." };
  }

  const event = await getEventById(media.eventId);

  if (!event) {
    return { ok: false, status: 404, error: "Evento não encontrado." };
  }

  if (!event.allowPublicDelete) {
    return {
      ok: false,
      status: 403,
      error: "Este evento não permite exclusão pública de mídias.",
    };
  }

  if (event.requireDeletePin) {
    const pinMatches = verifyDeletePin(pin ?? "", event.deletePinHash);

    console.log("[PUBLIC_MEDIA_DELETE] validacao de PIN", {
      mediaIdTail: trimmedId.slice(-8),
      eventId: event.id,
      pinLength: pin?.trim().length ?? 0,
      hasHash: Boolean(event.deletePinHash?.trim()),
      pinMatches,
    });

    if (!pinMatches) {
      return {
        ok: false,
        status: 401,
        error: "PIN incorreto. Confira o código e tente novamente.",
      };
    }
  }

  const deleted = await softDeleteGalleryMedia(trimmedId, "public");

  if (!deleted) {
    return { ok: false, status: 404, error: "Mídia não encontrada." };
  }

  return { ok: true, media: deleted };
}

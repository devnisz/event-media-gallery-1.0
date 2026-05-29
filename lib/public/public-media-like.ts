import { normalizeVisitorKey } from "@/lib/likes/visitor";
import {
  readMediaLikesFromStorage,
  writeMediaLikesToStorage,
} from "@/lib/likes/storage";
import { getEventById } from "@/services/eventService";
import {
  isMediaSoftDeleted,
  isMediaVisiblePublicly,
  loadGalleryVideosForMutation,
  updateGalleryMediaLikesCount,
} from "@/services/mediaService";
import {
  toggleMediaLikeOnSupabase,
  isSupabaseMediaLikesAvailable,
} from "@/repositories/mediaLikesRepository";

export type PublicMediaLikeResult =
  | {
      ok: true;
      liked: boolean;
      likesCount: number;
      mediaId: string;
      eventId: string;
      eventSlug: string;
    }
  | { ok: false; status: number; error: string };

export async function togglePublicMediaLike(
  mediaId: string,
  visitorKeyRaw: unknown,
): Promise<PublicMediaLikeResult> {
  const trimmedId = mediaId.trim();
  const visitorKey = normalizeVisitorKey(visitorKeyRaw);

  if (!trimmedId) {
    return { ok: false, status: 400, error: "Mídia inválida." };
  }

  if (!visitorKey) {
    return { ok: false, status: 400, error: "Identificador de visitante inválido." };
  }

  const mediaList = await loadGalleryVideosForMutation();
  const media = mediaList.find((item) => item.id === trimmedId);

  if (!media || isMediaSoftDeleted(media) || !isMediaVisiblePublicly(media)) {
    return { ok: false, status: 404, error: "Mídia não encontrada." };
  }

  const event = await getEventById(media.eventId);

  if (!event) {
    return { ok: false, status: 404, error: "Evento não encontrado." };
  }

  if (!event.allowLikes) {
    return {
      ok: false,
      status: 403,
      error: "Este evento não permite curtidas.",
    };
  }

  const currentCount = Math.max(0, media.likesCount ?? 0);

  if (await isSupabaseMediaLikesAvailable()) {
    try {
      const result = await toggleMediaLikeOnSupabase(trimmedId, visitorKey);

      return {
        ok: true,
        liked: result.liked,
        likesCount: result.likesCount,
        mediaId: trimmedId,
        eventId: media.eventId,
        eventSlug: media.eventSlug,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível curtir.";

      return { ok: false, status: 500, error: message };
    }
  }

  const likes = await readMediaLikesFromStorage();
  const existingIndex = likes.findIndex(
    (row) => row.mediaId === trimmedId && row.visitorKey === visitorKey,
  );
  const alreadyLiked = existingIndex !== -1;

  let nextCount = currentCount;
  let nextLiked = alreadyLiked;

  if (alreadyLiked) {
    likes.splice(existingIndex, 1);
    nextCount = Math.max(0, currentCount - 1);
    nextLiked = false;
  } else {
    likes.push({ mediaId: trimmedId, visitorKey });
    nextCount = currentCount + 1;
    nextLiked = true;
  }

  await writeMediaLikesToStorage(likes);

  const updated = await updateGalleryMediaLikesCount(trimmedId, nextCount);

  if (!updated) {
    return { ok: false, status: 404, error: "Mídia não encontrada." };
  }

  return {
    ok: true,
    liked: nextLiked,
    likesCount: nextCount,
    mediaId: trimmedId,
    eventId: media.eventId,
    eventSlug: media.eventSlug,
  };
}

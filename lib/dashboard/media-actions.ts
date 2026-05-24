import type { GalleryMediaRecord, MediaReviewStatus } from "@/types/media";
import { getEventById } from "@/services/eventService";
import {
  isMediaSoftDeleted,
  loadGalleryVideosForMutation,
  softDeleteGalleryMedia,
  updateGalleryMediaState,
  type MediaStatePatch,
} from "@/services/mediaService";
import {
  assertUserCanMutateMediaForEvent,
  DashboardAccessError,
} from "@/lib/auth/dashboard-access";

export type DashboardMediaActionResult =
  | { ok: true; media: GalleryMediaRecord }
  | { ok: false; status: number; error: string };

async function resolveMutableMedia(userId: string, mediaId: string) {
  const mediaList = await loadGalleryVideosForMutation();
  const media = mediaList.find((item) => item.id === mediaId);
  const event = media ? await getEventById(media.eventId) : undefined;

  try {
    assertUserCanMutateMediaForEvent(userId, media, event);
  } catch (err) {
    if (err instanceof DashboardAccessError) {
      return { ok: false as const, status: err.status, error: err.message };
    }

    throw err;
  }

  if (isMediaSoftDeleted(media)) {
    return {
      ok: false as const,
      status: 404,
      error: "Mídia não encontrada.",
    };
  }

  return { ok: true as const, media };
}

export async function updateDashboardMediaState(
  userId: string,
  mediaId: string,
  patch: Pick<MediaStatePatch, "isHidden" | "isFavorite" | "reviewStatus">,
): Promise<DashboardMediaActionResult> {
  const resolved = await resolveMutableMedia(userId, mediaId);

  if (!resolved.ok) {
    return resolved;
  }

  const media = await updateGalleryMediaState(mediaId, patch);

  if (!media) {
    return {
      ok: false,
      status: 404,
      error: "Mídia não encontrada.",
    };
  }

  return { ok: true, media };
}

export function isValidReviewStatus(value: unknown): value is MediaReviewStatus {
  return value === "approved" || value === "pending" || value === "rejected";
}

export async function softDeleteDashboardMedia(
  userId: string,
  mediaId: string,
): Promise<DashboardMediaActionResult> {
  const resolved = await resolveMutableMedia(userId, mediaId);

  if (!resolved.ok) {
    return resolved;
  }

  const media = await softDeleteGalleryMedia(mediaId, userId);

  if (!media) {
    return {
      ok: false,
      status: 404,
      error: "Mídia não encontrada.",
    };
  }

  return { ok: true, media };
}

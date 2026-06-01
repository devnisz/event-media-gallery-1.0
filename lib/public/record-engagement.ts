import { normalizeVisitorKey } from "@/lib/likes/visitor";
import {
  readAnalyticsSessions,
  upsertViewSession,
  writeAnalyticsSessions,
} from "@/lib/analytics/storage";
import {
  incrementMediaDownloadOnSupabase,
  incrementMediaShareOnSupabase,
  isSupabaseEventAnalyticsAvailable,
  recordEventGalleryViewOnSupabase,
  recordMediaViewOnSupabase,
} from "@/repositories/eventAnalyticsRepository";
import { getEventBySlug } from "@/services/eventService";
import {
  incrementEventEngagementCount,
  incrementMediaEngagementCount,
  isMediaSoftDeleted,
  isMediaVisiblePublicly,
  loadGalleryVideosForMutation,
} from "@/services/mediaService";

type OkResult<T> = { ok: true } & T;
type ErrResult = { ok: false; status: number; error: string };

export type RecordEngagementResult = OkResult<{ counted: boolean }> | ErrResult;

export async function recordEventGalleryView(
  eventSlug: string,
  visitorKeyRaw: unknown,
): Promise<RecordEngagementResult & { eventId?: string }> {
  const slug = eventSlug.trim().toLowerCase();
  const visitorKey = normalizeVisitorKey(visitorKeyRaw);

  if (!slug) {
    return { ok: false, status: 400, error: "Evento inválido." };
  }

  if (!visitorKey) {
    return { ok: false, status: 400, error: "Identificador de visitante inválido." };
  }

  const event = await getEventBySlug(slug);

  if (!event) {
    return { ok: false, status: 404, error: "Evento não encontrado." };
  }

  if (await isSupabaseEventAnalyticsAvailable()) {
    try {
      const result = await recordEventGalleryViewOnSupabase(event.id, visitorKey);

      return {
        ok: true,
        counted: result.counted,
        eventId: event.id,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível registrar visualização.";

      return { ok: false, status: 500, error: message };
    }
  }

  const sessions = await readAnalyticsSessions();
  const nowIso = new Date().toISOString();
  const updated = upsertViewSession(
    sessions.eventGalleryViews,
    event.id,
    visitorKey,
    nowIso,
  );

  await writeAnalyticsSessions({
    ...sessions,
    eventGalleryViews: updated.rows,
  });

  if (updated.counted) {
    await incrementEventEngagementCount(event.id, { viewCount: 1 });
  }

  return { ok: true, counted: updated.counted, eventId: event.id };
}

export async function recordMediaView(
  mediaId: string,
  visitorKeyRaw: unknown,
): Promise<RecordEngagementResult & { eventId?: string; eventSlug?: string }> {
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

  if (await isSupabaseEventAnalyticsAvailable()) {
    try {
      const result = await recordMediaViewOnSupabase(trimmedId, visitorKey);

      return {
        ok: true,
        counted: result.counted,
        eventId: media.eventId,
        eventSlug: media.eventSlug,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível registrar visualização.";

      return { ok: false, status: 500, error: message };
    }
  }

  const sessions = await readAnalyticsSessions();
  const nowIso = new Date().toISOString();
  const updated = upsertViewSession(
    sessions.mediaViews,
    trimmedId,
    visitorKey,
    nowIso,
  );

  await writeAnalyticsSessions({
    ...sessions,
    mediaViews: updated.rows,
  });

  if (updated.counted) {
    await incrementMediaEngagementCount(trimmedId, { viewCount: 1 });
  }

  return {
    ok: true,
    counted: updated.counted,
    eventId: media.eventId,
    eventSlug: media.eventSlug,
  };
}

export async function recordMediaDownload(
  mediaId: string,
): Promise<RecordEngagementResult & { eventId?: string; eventSlug?: string }> {
  const trimmedId = mediaId.trim();

  if (!trimmedId) {
    return { ok: false, status: 400, error: "Mídia inválida." };
  }

  const mediaList = await loadGalleryVideosForMutation();
  const media = mediaList.find((item) => item.id === trimmedId);

  if (!media || isMediaSoftDeleted(media) || !isMediaVisiblePublicly(media)) {
    return { ok: false, status: 404, error: "Mídia não encontrada." };
  }

  if (await isSupabaseEventAnalyticsAvailable()) {
    try {
      await incrementMediaDownloadOnSupabase(trimmedId);

      return {
        ok: true,
        counted: true,
        eventId: media.eventId,
        eventSlug: media.eventSlug,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível registrar download.";

      return { ok: false, status: 500, error: message };
    }
  }

  await incrementMediaEngagementCount(trimmedId, { downloadCount: 1 });
  await incrementEventEngagementCount(media.eventId, { downloadCount: 1 });

  return {
    ok: true,
    counted: true,
    eventId: media.eventId,
    eventSlug: media.eventSlug,
  };
}

export async function recordMediaShare(
  mediaId: string,
): Promise<RecordEngagementResult & { eventId?: string; eventSlug?: string }> {
  const trimmedId = mediaId.trim();

  if (!trimmedId) {
    return { ok: false, status: 400, error: "Mídia inválida." };
  }

  const mediaList = await loadGalleryVideosForMutation();
  const media = mediaList.find((item) => item.id === trimmedId);

  if (!media || isMediaSoftDeleted(media) || !isMediaVisiblePublicly(media)) {
    return { ok: false, status: 404, error: "Mídia não encontrada." };
  }

  if (await isSupabaseEventAnalyticsAvailable()) {
    try {
      await incrementMediaShareOnSupabase(trimmedId);

      return {
        ok: true,
        counted: true,
        eventId: media.eventId,
        eventSlug: media.eventSlug,
      };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível registrar compartilhamento.";

      return { ok: false, status: 500, error: message };
    }
  }

  await incrementMediaEngagementCount(trimmedId, { shareCount: 1 });
  await incrementEventEngagementCount(media.eventId, { shareCount: 1 });

  return {
    ok: true,
    counted: true,
    eventId: media.eventId,
    eventSlug: media.eventSlug,
  };
}

/**
 * Persistência de mídia: Supabase quando configurado, com fallback JSON.
 */
import type { GalleryMediaRecord } from "@/types/media";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  isSupabaseConfigured,
  logMigration,
  logRepository,
  shouldDualWriteLegacyJson,
} from "@/lib/supabase/config";
import {
  readVideosJsonRaw,
  writeVideosToStorage,
} from "@/services/storageService";
import type { SupabaseClient } from "@supabase/supabase-js";

type MediaRow = {
  id: string;
  event_id: string;
  event_slug: string;
  name: string;
  media_type: string;
  file_type: string;
  url: string;
  thumbnail_url: string | null;
  qr_code: string;
  created_at: string;
  uploaded_at: string | null;
  legacy_timestamp: string | null;
  order_index: number | null;
};

function hasManualOrderIndex(record: GalleryMediaRecord): boolean {
  return (
    typeof record.orderIndex === "number" && Number.isFinite(record.orderIndex)
  );
}

function rowToLegacyJson(row: MediaRow): Record<string, unknown> {
  const o: Record<string, unknown> = {
    id: row.id,
    eventId: row.event_id,
    eventSlug: row.event_slug,
    name: row.name,
    url: row.url,
    videoUrl: row.url,
    qrCode: row.qr_code,
    mediaType: row.media_type,
    fileType: row.file_type,
    createdAt: row.created_at,
  };

  if (row.thumbnail_url) {
    o.thumbnailUrl = row.thumbnail_url;
    o.thumbnail = row.thumbnail_url;
  }

  if (row.uploaded_at) {
    o.uploadedAt = row.uploaded_at;
  }

  if (row.legacy_timestamp) {
    o.timestamp = row.legacy_timestamp;
  }

  if (row.order_index != null && Number.isFinite(row.order_index)) {
    o.orderIndex = row.order_index;
  }

  return o;
}

function galleryRecordToRow(
  m: GalleryMediaRecord,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: m.id,
    event_id: m.eventId,
    event_slug: m.eventSlug,
    name: m.name,
    media_type: m.mediaType,
    file_type: m.fileType,
    url: m.url,
    qr_code: m.qrCode,
    created_at: m.createdAt ?? new Date().toISOString(),
    thumbnail_url: m.thumbnailUrl ?? null,
    uploaded_at: m.uploadedAt ?? null,
    legacy_timestamp: m.timestamp ?? null,
    order_index: hasManualOrderIndex(m) ? m.orderIndex! : null,
  };

  return row;
}

function buildLegacyJsonRowsFromGallery(
  mediaList: GalleryMediaRecord[],
): unknown[] {
  return mediaList.map((m) => {
    const row: Record<string, unknown> = {
      id: m.id,
      eventId: m.eventId,
      eventSlug: m.eventSlug,
      name: m.name,
      url: m.url,
      videoUrl: m.url,
      qrCode: m.qrCode,
      mediaType: m.mediaType,
      fileType: m.fileType,
    };

    if (m.thumbnailUrl) {
      row.thumbnailUrl = m.thumbnailUrl;
      row.thumbnail = m.thumbnailUrl;
    }

    if (m.createdAt) {
      row.createdAt = m.createdAt;
    }

    if (m.uploadedAt) {
      row.uploadedAt = m.uploadedAt;
    }

    if (m.timestamp) {
      row.timestamp = m.timestamp;
    }

    if (hasManualOrderIndex(m)) {
      row.orderIndex = m.orderIndex;
    }

    return row;
  });
}

async function persistMediaJsonLegacy(mediaList: GalleryMediaRecord[]): Promise<void> {
  await writeVideosToStorage(buildLegacyJsonRowsFromGallery(mediaList));
}

async function loadMediaFromSupabase(client: SupabaseClient): Promise<unknown[]> {
  const { data, error } = await client.from("media").select("*");

  if (error) {
    throw error;
  }

  return (data as MediaRow[] | null)?.map(rowToLegacyJson) ?? [];
}

async function syncMediaToSupabase(
  client: SupabaseClient,
  mediaList: GalleryMediaRecord[],
): Promise<void> {
  const keep = new Set(mediaList.map((m) => m.id));

  const { data: existing, error: selErr } = await client
    .from("media")
    .select("id");

  if (selErr) {
    throw selErr;
  }

  const stale =
    (existing as { id: string }[] | null)
      ?.map((r) => r.id)
      .filter((id) => !keep.has(id)) ?? [];

  if (stale.length > 0) {
    const { error: delErr } = await client.from("media").delete().in("id", stale);

    if (delErr) {
      throw delErr;
    }
  }

  const rows = mediaList.map(galleryRecordToRow);

  if (rows.length === 0) {
    return;
  }

  const { error: upErr } = await client.from("media").upsert(rows, {
    onConflict: "id",
  });

  if (upErr) {
    throw upErr;
  }
}

/** Leitura bruta compatível com `mediaService` / parser legado. */
export async function readPersistedMediaRaw(): Promise<unknown[]> {
  if (!isSupabaseConfigured()) {
    logMigration("media read → JSON (Supabase não configurado)");
    return readVideosJsonRaw();
  }

  const client = createServerSupabase();

  if (!client) {
    return readVideosJsonRaw();
  }

  try {
    const rows = await loadMediaFromSupabase(client);
    logRepository(`media carregadas do Supabase: ${rows.length} linha(s)`);
    return rows;
  } catch (err) {
    logMigration("media Supabase falhou → fallback JSON", err);
    return readVideosJsonRaw();
  }
}

/** Substitui todas as linhas de mídia (espelha `videos.json`). */
export async function replaceAllMediaFromGalleryRecords(
  mediaList: GalleryMediaRecord[],
): Promise<void> {
  if (!isSupabaseConfigured()) {
    await persistMediaJsonLegacy(mediaList);
    logMigration("media escritas apenas em JSON");
    return;
  }

  const client = createServerSupabase();

  if (!client) {
    await persistMediaJsonLegacy(mediaList);
    return;
  }

  try {
    await syncMediaToSupabase(client, mediaList);
    logRepository(`media persistidas no Supabase: ${mediaList.length}`);

    if (shouldDualWriteLegacyJson()) {
      await persistMediaJsonLegacy(mediaList);
      logMigration("media dual-write JSON espelho concluído");
    }
  } catch (err) {
    logMigration("media falha ao escrever no Supabase → JSON", err);
    await persistMediaJsonLegacy(mediaList);
  }
}

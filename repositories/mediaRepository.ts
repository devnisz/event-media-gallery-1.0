/**
 * Persistência de mídia: Supabase quando configurado, com fallback JSON.
 */
import type { GalleryMediaRecord } from "@/types/media";
import {
  createServerSupabase,
  getSupabaseServerKeyMode,
} from "@/lib/supabase/server";
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
import { readEventsLooseForHydration } from "@/repositories/eventRepository";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Linha bruta do PostgREST (snake_case; colunas opcionais conforme inserts externos). */
type SupabaseMediaRow = Record<string, unknown>;

function logFrontendMedia(message: string, meta?: Record<string, unknown>): void {
  const suffix =
    meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[FRONTEND_MEDIA] ${message}${suffix}`);
}

function coerceOptionalString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function optionalIsoDate(value: unknown): string | undefined {
  const s = coerceOptionalString(value);

  if (!s) {
    return undefined;
  }

  const t = Date.parse(s);

  return Number.isFinite(t) ? new Date(t).toISOString() : s;
}

/** UUID v4 usado apenas para fallback quando a rota passa id em vez de slug. */
function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function normalizeEventSlugEq(value: string): string {
  return value.trim();
}

/** ILIKE equivalente ao “=” quando os metacaracteres % e _ são escapados. */
function escapeIlikeExactLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function legacyJsonMatchesEventSlug(
  item: Record<string, unknown>,
  slug: string,
  resolvedEventId?: string,
): boolean {
  if (legacyJsonMatchesEventSlugOnly(item, slug)) {
    return true;
  }

  const ev = resolvedEventId?.trim();

  if (!ev) {
    return false;
  }

  const idRaw = item.event_id ?? item.eventId;
  const id = typeof idRaw === "string" ? idRaw.trim().toLowerCase() : "";

  return id.length > 0 && id === ev.toLowerCase();
}

function legacyJsonMatchesEventSlugOnly(
  item: Record<string, unknown>,
  slug: string,
): boolean {
  const needle = normalizeEventSlugEq(slug).toLowerCase();
  const candidates = [
    item.event_slug,
    item.eventSlug,
    item.event_id,
    item.eventId,
  ];

  for (const raw of candidates) {
    const s =
      typeof raw === "string" ? raw.trim().toLowerCase() : "";

    if (s && s === needle) {
      return true;
    }
  }

  return false;
}

function legacyJsonMatchesEventSlugOrId(
  item: Record<string, unknown>,
  slug: string,
  resolvedEventId?: string,
): boolean {
  if (legacyJsonMatchesEventSlug(item, slug)) {
    return true;
  }

  const idNeedle = resolvedEventId?.trim().toLowerCase();

  if (!idNeedle) {
    return false;
  }

  for (const key of ["event_id", "eventId"] as const) {
    const v = item[key];

    if (typeof v === "string" && v.trim().toLowerCase() === idNeedle) {
      return true;
    }
  }

  return false;
}

function optionalFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const n = Number(value);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  return undefined;
}

function coerceRowStringId(row: SupabaseMediaRow): string {
  const v = row.id;

  if (typeof v === "string") {
    return v.trim();
  }

  if (typeof v === "number" && Number.isFinite(v)) {
    return String(Math.trunc(v));
  }

  return "";
}

/**
 * Converte uma linha `media` do Supabase para o formato esperado por `mediaService`
 * (`videoUrl`, `thumbnail`, URL de QR quando `qr_code` vem do banco).
 */
function rowToLegacyJson(row: SupabaseMediaRow): Record<string, unknown> {
  const id = coerceRowStringId(row);
  const eventId = coerceOptionalString(row.event_id);
  const eventSlug = coerceOptionalString(row.event_slug);
  const name =
    coerceOptionalString(row.name) ||
    coerceOptionalString(row.filename) ||
    "Mídia";
  const url =
    coerceOptionalString(row.url) ||
    coerceOptionalString(row.video_url) ||
    coerceOptionalString(row.videoUrl) ||
    coerceOptionalString(row.public_url) ||
    coerceOptionalString(row.file_url) ||
    coerceOptionalString(row.playback_url) ||
    coerceOptionalString(row.src);
  const mediaType = coerceOptionalString(row.media_type);
  const fileType = coerceOptionalString(row.file_type);
  const thumbnailUrl =
    coerceOptionalString(row.thumbnail_url) ||
    coerceOptionalString(row.thumbnailUrl);
  const qrFromDb =
    coerceOptionalString(row.qr_code) || coerceOptionalString(row.qrCode);
  const qrCode = qrFromDb;

  const o: Record<string, unknown> = {
    id,
    eventId,
    eventSlug,
    name,
    url,
    videoUrl: url,
    qrCode,
    mediaType,
    fileType,
  };

  const createdAt =
    optionalIsoDate(row.created_at) ??
    optionalIsoDate(row.createdAt);

  if (createdAt) {
    o.createdAt = createdAt;
  }

  if (thumbnailUrl) {
    o.thumbnailUrl = thumbnailUrl;
    o.thumbnail = thumbnailUrl;
  }

  const uploadedAt =
    optionalIsoDate(row.uploaded_at) ??
    optionalIsoDate(row.uploadedAt);

  if (uploadedAt) {
    o.uploadedAt = uploadedAt;
  }

  const legacyTs =
    optionalIsoDate(row.legacy_timestamp) ??
    optionalIsoDate(row.timestamp);

  if (legacyTs) {
    o.timestamp = legacyTs;
  }

  const orderIdx =
    optionalFiniteNumber(row.order_index) ??
    optionalFiniteNumber(row.orderIndex);

  if (orderIdx !== undefined) {
    o.orderIndex = orderIdx;
  }

  const ownerRaw = row.owner_user_id ?? row.ownerUserId;
  const ownerStr =
    typeof ownerRaw === "string" && ownerRaw.trim()
      ? ownerRaw.trim()
      : "";

  if (ownerStr) {
    o.ownerUserId = ownerStr;
  }

  return o;
}

function hasManualOrderIndex(record: GalleryMediaRecord): boolean {
  return (
    typeof record.orderIndex === "number" && Number.isFinite(record.orderIndex)
  );
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
    owner_user_id: m.ownerUserId?.trim() ? m.ownerUserId.trim() : null,
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

    if (m.ownerUserId?.trim()) {
      row.ownerUserId = m.ownerUserId.trim();
    }

    return row;
  });
}

async function persistMediaJsonLegacy(mediaList: GalleryMediaRecord[]): Promise<void> {
  await writeVideosToStorage(buildLegacyJsonRowsFromGallery(mediaList));
}

async function loadMediaFromSupabase(
  client: SupabaseClient,
  slugFilter?: string,
  resolvedEventId?: string,
): Promise<unknown[]> {
  const slugEq = slugFilter?.trim();
  const eventIdEq = resolvedEventId?.trim();

  async function fetchRows(
    filter: {
      column: "event_slug" | "event_id";
      value: string;
    } | null,
  ): Promise<unknown[]> {
    let qb = client.from("media").select("*");

    if (filter) {
      qb = qb.eq(filter.column, filter.value);
    }

    const { data, error } = await qb;

    console.log("[FRONTEND_MEDIA]", data);

    if (error) {
      logFrontendMedia("media.select erro PostgREST", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        keyMode: getSupabaseServerKeyMode(),
      });
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async function fetchRowsByEventSlug(trimmedSlug: string): Promise<unknown[]> {
    let rows = await fetchRows({
      column: "event_slug",
      value: normalizeEventSlugEq(trimmedSlug),
    });

    if (rows.length === 0 && trimmedSlug.length > 0) {
      const { data, error } = await client
        .from("media")
        .select("*")
        .ilike("event_slug", escapeIlikeExactLiteral(trimmedSlug));

      console.log("[FRONTEND_MEDIA]", data);

      if (error) {
        logFrontendMedia("media.select ILIKE erro PostgREST", {
          message: error.message,
          code: error.code,
          keyMode: getSupabaseServerKeyMode(),
        });
        throw error;
      }

      rows = Array.isArray(data) ? data : [];

      if (rows.length > 0) {
        logFrontendMedia("media.select event_slug recuperado via ILIKE (case insensitive)", {
          rowCount: rows.length,
        });
      }
    }

    return rows;
  }

  let rows: unknown[];

  if (slugEq) {
    rows = await fetchRowsByEventSlug(slugEq);

    /**
     * Uploaders externos costumam gravar só `event_id`; `event_slug` pode estar null ou
     * não bater com o slug canônico da galeria.
     */
    if (rows.length === 0 && eventIdEq) {
      rows = await fetchRows({
        column: "event_id",
        value: eventIdEq,
      });
      logFrontendMedia("media.select por event_id do evento (slug SQL sem resultado)", {
        rowCount: rows.length,
        keyMode: getSupabaseServerKeyMode(),
        eventIdTail: eventIdEq.slice(-8),
      });
    }

    if (rows.length === 0 && looksLikeUuid(slugEq)) {
      rows = await fetchRows({
        column: "event_id",
        value: normalizeEventSlugEq(slugEq),
      });
      logFrontendMedia("media.select por event_id (slug da URL parecia UUID)", {
        rowCount: rows.length,
      });
    }
  } else {
    rows = await fetchRows(null);
  }

  logFrontendMedia("Supabase media.select concluído", {
    rowCount: rows.length,
    keyMode: getSupabaseServerKeyMode(),
    filtroSlug: slugEq ?? null,
    tentouEventId: Boolean(eventIdEq),
    bypassRls: getSupabaseServerKeyMode() === "service",
  });

  if (rows.length === 0) {
    const mode = getSupabaseServerKeyMode();

    if (mode === "anon") {
      logFrontendMedia(
        "media.select retornou 0 linhas com chave ANON — se há dados no painel Supabase, a política RLS pode estar bloqueando o SELECT. Use SUPABASE_SERVICE_ROLE_KEY nas env do servidor Next ou crie uma policy de leitura.",
      );
    } else {
      logFrontendMedia("media.select retornou 0 linhas.", { keyMode: mode });
    }
  }

  const legacy = rows
    .filter((r): r is SupabaseMediaRow => !!r && typeof r === "object")
    .map((r) => rowToLegacyJson(r))
    .filter((o) => {
      const primary =
        typeof o.url === "string"
          ? o.url.trim()
          : typeof o.videoUrl === "string"
            ? String(o.videoUrl).trim()
            : "";
      const ok =
        typeof o.id === "string" &&
        o.id.trim().length > 0 &&
        primary.length > 0;

      if (!ok) {
        logFrontendMedia("linha ignorada (sem id ou url válidos)", {
          idSample: typeof o.id === "string" ? o.id.slice(0, 8) : null,
        });
      }

      return ok;
    });

  logFrontendMedia("normalização snake_case → legacy JSON", {
    kept: legacy.length,
    dropped: rows.length - legacy.length,
  });

  return legacy;
}

async function syncMediaToSupabase(
  client: SupabaseClient,
  mediaList: GalleryMediaRecord[],
): Promise<void> {
  const keep = new Set(mediaList.map((m) => m.id));

  const eventsLoose = await readEventsLooseForHydration();
  const ownerByEventId = new Map<string, string | null>();

  for (const ev of eventsLoose) {
    ownerByEventId.set(ev.id, ev.ownerUserId?.trim() ?? null);
  }

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

  const rows = mediaList.map((m) => {
    const row = galleryRecordToRow(m);
    const inherited = ownerByEventId.get(m.eventId) ?? null;
    const explicit = m.ownerUserId?.trim() ? m.ownerUserId.trim() : null;

    row.owner_user_id = explicit ?? inherited ?? null;

    return row;
  });

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

/**
 * Leitura bruta apenas para uma página de evento: `event_slug = slug`
 * (fallback `event_id` quando o slug da URL for UUID ou quando `resolvedEventId` for informado).
 */
export async function readPersistedMediaRawForEventSlug(
  slug: string,
  resolvedEventId?: string,
): Promise<unknown[]> {
  if (!slug?.trim()) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    return readPersistedMediaRawForEventSlugFromJson(slug, resolvedEventId);
  }

  const client = createServerSupabase();

  if (!client) {
    return readPersistedMediaRawForEventSlugFromJson(slug, resolvedEventId);
  }

  const keyMode = getSupabaseServerKeyMode();
  logFrontendMedia("readPersistedMediaRawForEventSlug", {
    keyMode,
    usandoServiceRole: keyMode === "service",
    slugSample: slug.trim().slice(0, 64),
    comEventId: Boolean(resolvedEventId?.trim()),
  });

  try {
    const rows = await loadMediaFromSupabase(client, slug, resolvedEventId);
    logRepository(
      `media do evento (Supabase slug=${normalizeEventSlugEq(slug)}): ${rows.length} linha(s)`,
    );
    return rows;
  } catch (err) {
    logFrontendMedia(
      "Supabase indisponível para event_slug — fallback JSON filtrado",
      {
        message: err instanceof Error ? err.message : String(err),
      },
    );
    logMigration(
      "media por event_slug Supabase falhou → fallback JSON filtrado",
      err,
    );
    return readPersistedMediaRawForEventSlugFromJson(slug, resolvedEventId);
  }
}

async function readPersistedMediaRawForEventSlugFromJson(
  slug: string,
  resolvedEventId?: string,
): Promise<unknown[]> {
  const rawAll = await readVideosJsonRaw();
  const arr = Array.isArray(rawAll) ? rawAll : [];

  return arr
    .filter((it): it is Record<string, unknown> =>
      !!it && typeof it === "object",
    )
    .filter((it) =>
      legacyJsonMatchesEventSlugOrId(it, slug, resolvedEventId),
    );
}

/** Leitura bruta compatível com `mediaService` / parser legado. */
export async function readPersistedMediaRaw(): Promise<unknown[]> {
  if (!isSupabaseConfigured()) {
    logFrontendMedia(
      "Supabase não configurado no Next (precisa URL + anon ou service role) — lendo apenas videos.json local.",
    );
    logMigration("media read → JSON (Supabase não configurado)");
    return readVideosJsonRaw();
  }

  const client = createServerSupabase();

  if (!client) {
    logFrontendMedia(
      "Cliente Supabase não criado — fallback videos.json (verifique SUPABASE_URL e chaves).",
    );
    return readVideosJsonRaw();
  }

  try {
    const rows = await loadMediaFromSupabase(client);
    logRepository(`media carregadas do Supabase: ${rows.length} linha(s)`);
    return rows;
  } catch (err) {
    logFrontendMedia("Supabase indisponível ou erro na leitura — fallback JSON", {
      message: err instanceof Error ? err.message : String(err),
    });
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

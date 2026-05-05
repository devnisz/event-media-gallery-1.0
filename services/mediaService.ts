import { unlink } from "fs/promises";
import path from "path";
import { readEvents, writeEvents } from "@/services/eventService";
import {
  readPersistedMediaRaw,
  readPersistedMediaRawForEventSlug,
  replaceAllMediaFromGalleryRecords,
} from "@/repositories/mediaRepository";
import type { GalleryEventRecord } from "@/types/event";
import type { EventMedia, GalleryMediaRecord } from "@/types/media";
import { galleryPublicPath } from "@/lib/paths";
import { generateUniqueUploadToken } from "@/utils/generateUploadToken";
import {
  isMediaLike,
  toEventMedia,
  toGalleryRecord,
} from "@/lib/media/galleryMapping";
import { ensureUniqueSlug } from "@/utils/slug";
import { getSupabaseServerKeyMode } from "@/lib/supabase/server";
import {
  deleteAllObjectsWithPrefix,
  deleteR2ObjectsByKeys,
  tryCreateR2DeletionClient,
} from "@/lib/r2/removal";

const publicDirectory = galleryPublicPath();
const deletablePublicFolders = new Set([
  "videos",
  "thumbnails",
  "qrcodes",
  "images",
]);

const LEGACY_FALLBACK_EVENT_ID = "evt_legacy_import";
const LEGACY_FALLBACK_SLUG = "importacao-inicial";
const LEGACY_FALLBACK_NAME = "Importacao inicial";

function logFrontendMedia(message: string, meta?: Record<string, unknown>): void {
  const suffix =
    meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[FRONTEND_MEDIA] ${message}${suffix}`);
}

export function getPrimaryMediaUrl(record: GalleryMediaRecord): string {
  return record.url.trim();
}

function timeFieldToMs(value: string | undefined): number {
  if (!value?.trim()) {
    return NaN;
  }

  const t = Date.parse(value);

  return Number.isFinite(t) ? t : NaN;
}

/**
 * Instante usado na ordenação por data: prioriza `createdAt`, depois `uploadedAt`,
 * depois `timestamp`. Sem datas válidas: 0 (empate resolvido por `id`).
 */
function getSortTimeMs(record: GalleryMediaRecord): number {
  for (const field of [record.createdAt, record.uploadedAt, record.timestamp]) {
    const ms = timeFieldToMs(field);

    if (!Number.isNaN(ms)) {
      return ms;
    }
  }

  return 0;
}

function hasManualOrderIndex(record: GalleryMediaRecord): boolean {
  return typeof record.orderIndex === "number" && Number.isFinite(record.orderIndex);
}

/**
 * Comparador estável para a galeria: ordem manual (`orderIndex` ASC) primeiro;
 * depois data DESC (mais recente no topo); empate por `id` ASC.
 */
function compareGalleryMediaForDisplay(
  a: GalleryMediaRecord,
  b: GalleryMediaRecord,
): number {
  const aManual = hasManualOrderIndex(a);
  const bManual = hasManualOrderIndex(b);

  if (aManual && bManual) {
    const ai = a.orderIndex!;
    const bi = b.orderIndex!;

    if (ai !== bi) {
      return ai - bi;
    }

    const ta = getSortTimeMs(a);
    const tb = getSortTimeMs(b);

    if (ta !== tb) {
      return tb - ta;
    }

    return a.id.localeCompare(b.id);
  }

  if (aManual && !bManual) {
    return -1;
  }

  if (!aManual && bManual) {
    return 1;
  }

  const ta = getSortTimeMs(a);
  const tb = getSortTimeMs(b);

  if (ta !== tb) {
    return tb - ta;
  }

  return a.id.localeCompare(b.id);
}

/**
 * Ordenação única da galeria (domínio). Consumidores devem usar listas já ordenadas
 * vindas de `readGalleryVideosRaw` / APIs derivadas — não duplicar `.sort()` na UI.
 *
 * Futuro: com `orderIndex` definido no JSON, posicionamento manual precede a data.
 */
export function sortGalleryMediaRecords(
  list: GalleryMediaRecord[],
): GalleryMediaRecord[] {
  return [...list].sort(compareGalleryMediaForDisplay);
}

/** Delega à camada de repositório (Supabase + fallback JSON). */
export async function replaceGalleryMediaRecordsOnDisk(
  mediaList: GalleryMediaRecord[],
): Promise<void> {
  await replaceAllMediaFromGalleryRecords(mediaList);
}

async function readMediaFromDisk(): Promise<GalleryMediaRecord[]> {
  const parsed = await readPersistedMediaRaw();
  const rawCount = Array.isArray(parsed) ? parsed.length : 0;
  const records = parsed.filter(isMediaLike).map(toGalleryRecord);

  logFrontendMedia("readMediaFromDisk", {
    brutos: rawCount,
    aceitos: records.length,
  });

  return records;
}

async function migrateLegacyAssociations(
  mediaList: GalleryMediaRecord[],
): Promise<void> {
  const needsLegacy = mediaList.some(
    (v) => !v.eventId.trim() || !v.eventSlug.trim(),
  );

  if (!needsLegacy) {
    return;
  }

  const events = await readEvents();
  let legacy = events.find((e) => e.id === LEGACY_FALLBACK_EVENT_ID);

  if (!legacy) {
    const takenSlugs = new Set(events.map((e) => e.slug));
    const takenTokens = new Set(events.map((e) => e.uploadToken));
    const slug = ensureUniqueSlug(LEGACY_FALLBACK_SLUG, takenSlugs);
    legacy = {
      id: LEGACY_FALLBACK_EVENT_ID,
      name: LEGACY_FALLBACK_NAME,
      slug,
      uploadToken: generateUniqueUploadToken(takenTokens),
      createdAt: new Date().toISOString(),
      coverImage: "",
      videosCount: 0,
    };
    events.push(legacy);
    await writeEvents(events);
  }

  const resolvedSlug = legacy.slug;
  const resolvedId = legacy.id;

  for (const v of mediaList) {
    if (!v.eventId.trim() || !v.eventSlug.trim()) {
      v.eventId = resolvedId;
      v.eventSlug = resolvedSlug;

      if (!v.createdAt) {
        v.createdAt = new Date().toISOString();
      }
    }
  }

  await replaceGalleryMediaRecordsOnDisk(sortGalleryMediaRecords(mediaList));
}

async function reconcileEventCountsFromMediaList(
  mediaList: GalleryMediaRecord[],
): Promise<void> {
  const counts = new Map<string, number>();

  for (const v of mediaList) {
    if (!v.eventId.trim()) {
      continue;
    }

    counts.set(v.eventId, (counts.get(v.eventId) ?? 0) + 1);
  }

  const events = await readEvents();

  if (events.length === 0) {
    return;
  }

  const next = events.map((e) => ({
    ...e,
    videosCount: counts.get(e.id) ?? 0,
  }));

  await writeEvents(next);
}

export async function reconcileAllEventCounts(): Promise<void> {
  const mediaList = await readMediaFromDisk();

  await migrateLegacyAssociations(mediaList);
  await reconcileEventCountsFromMediaList(mediaList);
}

export async function readGalleryVideosRaw(): Promise<GalleryMediaRecord[]> {
  const mediaList = await readMediaFromDisk();

  await migrateLegacyAssociations(mediaList);
  await reconcileEventCountsFromMediaList(mediaList);

  const sorted = sortGalleryMediaRecords(mediaList);

  logFrontendMedia("readGalleryVideosRaw → lista final ordenada", {
    total: sorted.length,
  });

  return sorted;
}

/**
 * Lista mídia após migração legacy, sem reconciliar contagens no disco.
 */
export async function loadGalleryVideosForMutation(): Promise<
  GalleryMediaRecord[]
> {
  const mediaList = await readMediaFromDisk();

  await migrateLegacyAssociations(mediaList);

  return sortGalleryMediaRecords(mediaList);
}

/** @deprecated usar `readGalleryMediaRaw` quando padronizar nomes */
export async function getGalleryVideos(): Promise<GalleryMediaRecord[]> {
  return readGalleryVideosRaw();
}

export async function readGalleryMediaRaw(): Promise<GalleryMediaRecord[]> {
  return readGalleryVideosRaw();
}

export { buildPublicPageUrl } from "@/lib/media/publicPageUrl";

async function resolveEventNameMap(): Promise<Map<string, string>> {
  const events = await readEvents();
  const map = new Map<string, string>();

  for (const e of events) {
    map.set(e.id, e.name);
    map.set(e.slug, e.name);
  }

  return map;
}

function normalizeSlugPart(value: string): string {
  return value.trim().toLowerCase();
}

export async function getEventVideosForEventSlug(
  eventSlug: string,
  resolvedEventId?: string,
): Promise<EventMedia[]> {
  const parsed = await readPersistedMediaRawForEventSlug(
    eventSlug,
    resolvedEventId,
  );

  console.log("[FRONTEND_MEDIA]", parsed);

  const filtered = sortGalleryMediaRecords(
    parsed.filter(isMediaLike).map(toGalleryRecord),
  );

  logFrontendMedia("getEventVideosForEventSlug", {
    slugOuId: normalizeSlugPart(eventSlug).slice(0, 48),
    encontrados: filtered.length,
    comEventIdResolvido: Boolean(resolvedEventId?.trim()),
  });

  if (filtered.length === 0) {
    return [];
  }

  const nameMap = await resolveEventNameMap();
  const eventName =
    nameMap.get(eventSlug) ?? nameMap.get(filtered[0].eventId) ?? "Evento";

  return filtered.map((item, index) =>
    toEventMedia(item, eventName, index),
  );
}

export async function getEventVideos(): Promise<EventMedia[]> {
  const galleryMedia = await readGalleryVideosRaw();

  console.log("[FRONTEND_MEDIA]", {
    hook: "getEventVideos",
    total: galleryMedia.length,
    supabaseServerKeyMode: getSupabaseServerKeyMode(),
  });

  if (galleryMedia.length === 0) {
    return [];
  }

  const nameMap = await resolveEventNameMap();

  return galleryMedia.map((item, index) => {
    const eventName =
      nameMap.get(item.eventId) ??
      nameMap.get(item.eventSlug) ??
      "Evento";

    return toEventMedia(item, eventName, index);
  });
}

export async function getMediaById(id: string): Promise<EventMedia | undefined> {
  const galleryMedia = await readGalleryVideosRaw();
  const item = galleryMedia.find((v) => v.id === id);

  if (!item) {
    return undefined;
  }

  const nameMap = await resolveEventNameMap();
  const eventName =
    nameMap.get(item.eventId) ??
    nameMap.get(item.eventSlug) ??
    "Evento";

  const index = galleryMedia.indexOf(item);

  return toEventMedia(item, eventName, Math.max(0, index));
}

/** Compat: leitor / totem ainda importam este nome */
export async function getVideoById(id: string): Promise<EventMedia | undefined> {
  return getMediaById(id);
}

export async function getVideoBySlug(slug: string): Promise<EventMedia | undefined> {
  return getMediaById(slug);
}

function getPublicAssetPath(assetPath?: string) {
  if (!assetPath) {
    return null;
  }

  try {
    const pathname = new URL(assetPath, "https://local.gallery").pathname;
    const segments = pathname.split("/").filter(Boolean);
    const [folder] = segments;

    if (!folder || !deletablePublicFolders.has(folder)) {
      return null;
    }

    const filePath = path.normalize(path.join(publicDirectory, ...segments));
    const relativePath = path.relative(publicDirectory, filePath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return null;
    }

    return filePath;
  } catch {
    return null;
  }
}

async function removeAsset(assetPath?: string) {
  const filePath = getPublicAssetPath(assetPath);

  if (!filePath) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

export type UnlinkGalleryAssetResult = "removed" | "absent" | "skipped";

export async function unlinkGalleryPublicAsset(
  assetPath?: string,
): Promise<UnlinkGalleryAssetResult> {
  const filePath = getPublicAssetPath(assetPath);

  if (!filePath) {
    return "skipped";
  }

  try {
    await unlink(filePath);
    return "removed";
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "absent";
    }

    throw error;
  }
}

export async function deleteGalleryMedia(id: string) {
  const galleryMedia = await readGalleryVideosRaw();
  const item = galleryMedia.find((m) => m.id === id);

  if (!item) {
    return null;
  }

  const r2 = tryCreateR2DeletionClient();

  if (r2) {
    try {
      const prefix = `${r2.keyPrefix}/${item.id}/`;
      await deleteAllObjectsWithPrefix(r2.client, r2.bucket, prefix);
      await deleteR2ObjectsByKeys(r2.client, r2.bucket, [
        `thumbnails/${item.id}.jpg`,
        `qrcodes/${item.id}.png`,
      ]);
    } catch (err) {
      console.error("[deleteGalleryMedia] R2 (melhor esforço):", err);
    }
  }

  await Promise.all([
    removeAsset(item.url),
    removeAsset(item.thumbnailUrl),
    removeAsset(item.qrCode),
  ]);

  const remaining = sortGalleryMediaRecords(
    galleryMedia.filter((m) => m.id !== id),
  );

  await replaceGalleryMediaRecordsOnDisk(remaining);
  await reconcileEventCountsFromMediaList(remaining);

  return item;
}

/** Alias estável para APIs legadas chamadas “video”. */
export async function deleteGalleryVideo(id: string) {
  return deleteGalleryMedia(id);
}

export async function enrichEventsWithCovers(
  events: GalleryEventRecord[],
): Promise<
  Array<
    GalleryEventRecord & {
      displayCover: string | null;
    }
  >
> {
  const mediaList = await readGalleryVideosRaw();

  return events.map((event) => {
    const thumb =
      event.coverImage.trim() ||
      mediaList.find((v) => v.eventId === event.id && v.thumbnailUrl)
        ?.thumbnailUrl ||
      null;

    return {
      ...event,
      displayCover: thumb || null,
    };
  });
}

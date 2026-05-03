import { unlink } from "fs/promises";
import path from "path";
import { readEvents, writeEvents } from "@/services/eventService";
import { replaceAllMediaFromGalleryRecords, readPersistedMediaRaw } from "@/repositories/mediaRepository";
import type { GalleryEventRecord } from "@/types/event";
import type { EventMedia, GalleryMediaRecord } from "@/types/media";
import { galleryPublicPath } from "@/lib/paths";
import { generateUniqueUploadToken } from "@/utils/generateUploadToken";
import { inferFileType, inferMediaKind } from "@/utils/mediaInference";
import { ensureUniqueSlug } from "@/utils/slug";

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

const accents = [
  "from-amber-300 via-orange-500 to-fuchsia-600",
  "from-cyan-300 via-blue-500 to-violet-700",
  "from-emerald-300 via-teal-500 to-sky-700",
  "from-rose-300 via-pink-500 to-purple-700",
  "from-lime-300 via-yellow-500 to-orange-700",
  "from-indigo-300 via-violet-500 to-slate-900",
];

type RawMediaRecord = {
  id: string;
  name?: string;
  url?: string;
  videoUrl?: string;
  qrCode: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  eventId?: string;
  eventSlug?: string;
  createdAt?: unknown;
  uploadedAt?: unknown;
  timestamp?: unknown;
  orderIndex?: unknown;
  mediaType?: string;
  fileType?: string;
};

export function getPrimaryMediaUrl(record: GalleryMediaRecord): string {
  return record.url.trim();
}

function parseFiniteOrderIndex(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  return undefined;
}

/** Converte número (epoch s ou ms) ou string ISO para ISO normalizado. */
function coerceDateField(raw: unknown): string | undefined {
  if (raw == null) {
    return undefined;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw > 0 && raw < 1e12 ? Math.floor(raw * 1000) : Math.floor(raw);

    return new Date(ms).toISOString();
  }

  if (typeof raw === "string" && raw.trim()) {
    const parsed = Date.parse(raw);

    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return undefined;
}

function legacyStringDate(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }

  return undefined;
}

function toGalleryRecord(raw: RawMediaRecord): GalleryMediaRecord {
  const url = (raw.url ?? raw.videoUrl ?? "").trim();
  const thumbnailUrlRaw = (raw.thumbnailUrl ?? raw.thumbnail)?.trim();
  const thumbnailUrl = thumbnailUrlRaw || undefined;
  const mediaType = inferMediaKind(raw.mediaType, raw.fileType, url);
  const fileType = inferFileType(mediaType, raw.fileType, url);
  const createdAt =
    coerceDateField(raw.createdAt) ?? legacyStringDate(raw.createdAt);
  const uploadedAt =
    coerceDateField(raw.uploadedAt) ?? legacyStringDate(raw.uploadedAt);
  const timestamp =
    coerceDateField(raw.timestamp) ?? legacyStringDate(raw.timestamp);

  return {
    id: raw.id,
    eventId: raw.eventId?.trim() ?? "",
    eventSlug: raw.eventSlug?.trim() ?? "",
    name: raw.name?.trim() || "Mídia",
    url,
    qrCode: raw.qrCode,
    thumbnailUrl,
    mediaType,
    fileType,
    createdAt,
    uploadedAt,
    timestamp,
    orderIndex: parseFiniteOrderIndex(raw.orderIndex),
  };
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

function isMediaLike(item: unknown): item is RawMediaRecord {
  if (!item || typeof item !== "object") {
    return false;
  }

  const o = item as Record<string, unknown>;

  const primary =
    typeof o.url === "string"
      ? o.url
      : typeof o.videoUrl === "string"
        ? o.videoUrl
        : "";

  return (
    typeof o.id === "string" &&
    typeof o.qrCode === "string" &&
    primary.trim().length > 0
  );
}

async function readMediaFromDisk(): Promise<GalleryMediaRecord[]> {
  const parsed = await readPersistedMediaRaw();

  return parsed.filter(isMediaLike).map(toGalleryRecord);
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

  return sortGalleryMediaRecords(mediaList);
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

export function buildPublicPageUrl(pathname: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (base) {
    const normalizedBase = base.startsWith("http")
      ? base
      : `https://${base}`;

    const root = normalizedBase.endsWith("/")
      ? normalizedBase
      : `${normalizedBase}/`;

    return new URL(pathname.replace(/^\//, ""), root).toString();
  }

  return pathname;
}

function uiDurationLabel(mediaType: GalleryMediaRecord["mediaType"]): string {
  if (mediaType === "video") {
    return "Vídeo";
  }

  if (mediaType === "gif") {
    return "GIF";
  }

  return "Foto";
}

function toEventMedia(
  record: GalleryMediaRecord,
  eventName: string,
  index: number,
): EventMedia {
  const pageUrl = buildPublicPageUrl(`/video/${encodeURIComponent(record.id)}`);
  const thumb = record.thumbnailUrl;
  const url = record.url;

  return {
    id: record.id,
    slug: record.id,
    title: record.name,
    event: eventName,
    eventSlug: record.eventSlug,
    mediaType: record.mediaType,
    fileType: record.fileType,
    duration: uiDurationLabel(record.mediaType),
    resolution: "Full",
    accent: accents[index % accents.length],
    url,
    videoUrl: url,
    downloadUrl: url,
    qrUrl: pageUrl,
    qrCode: record.qrCode,
    thumbnail: thumb,
    thumbnailUrl: thumb,
  };
}

async function resolveEventNameMap(): Promise<Map<string, string>> {
  const events = await readEvents();
  const map = new Map<string, string>();

  for (const e of events) {
    map.set(e.id, e.name);
    map.set(e.slug, e.name);
  }

  return map;
}

export async function getEventVideosForEventSlug(
  eventSlug: string,
): Promise<EventMedia[]> {
  const galleryMedia = await readGalleryVideosRaw();
  const filtered = galleryMedia.filter((v) => v.eventSlug === eventSlug);

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
